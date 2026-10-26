import { config } from "dotenv";
import pg from "pg";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

config({ quiet: true });

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const ageIndex = args.indexOf("--min-age-hours");
const minAgeHours = ageIndex >= 0 ? Number(args[ageIndex + 1]) : 24;

const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY?.trim();
const endpoint = process.env.CLOUDFLARE_R2_BUCKET_ENDPOINT?.trim();
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!Number.isFinite(minAgeHours) || minAgeHours < 1) {
  console.error("--min-age-hours must be a number of at least 1.");
  process.exit(1);
}
if (!databaseUrl) {
  console.error("Missing DATABASE_URL or DIRECT_URL.");
  process.exit(1);
}
if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
  console.error(
    "Missing Cloudflare R2 credentials. Set CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, and CLOUDFLARE_R2_BUCKET_ENDPOINT.",
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});
const pool = new pg.Pool({ connectionString: databaseUrl });
const cutoff = Date.now() - minAgeHours * 60 * 60 * 1000;
const prefixes = ["listings/", "profiles/", "migrated/"];

let scanned = 0;
let candidates = 0;
let referenced = 0;
let deleted = 0;
let failed = 0;

async function referencedKeys(keys) {
  if (keys.length === 0) return new Set();
  const result = await pool.query(
    `select storage_path as key from public.listing_images where storage_path = any($1::text[])
     union
     select avatar_path as key from public.profiles where avatar_path = any($1::text[])
     union
     select icon_key as key from public.categories where icon_key = any($1::text[])`,
    [keys],
  );
  return new Set(result.rows.map((row) => row.key));
}

async function processPrefix(prefix) {
  let token;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );

    const oldKeys = (page.Contents ?? [])
      .filter(
        (object) =>
          object.Key &&
          object.LastModified &&
          object.LastModified.getTime() < cutoff,
      )
      .map((object) => object.Key);

    scanned += page.Contents?.length ?? 0;
    const stillUsed = await referencedKeys(oldKeys);
    const orphaned = oldKeys.filter((key) => !stillUsed.has(key));
    candidates += orphaned.length;
    referenced += oldKeys.length - orphaned.length;

    for (const key of orphaned) {
      if (!apply) {
        console.log(JSON.stringify({ status: "candidate", key }));
        continue;
      }
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
        deleted += 1;
        console.log(JSON.stringify({ status: "deleted", key }));
      } catch (error) {
        failed += 1;
        console.error(
          JSON.stringify({
            status: "failed",
            key,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

try {
  for (const prefix of prefixes) await processPrefix(prefix);
  console.log(
    JSON.stringify({
      apply,
      minAgeHours,
      scanned,
      candidates,
      referenced,
      deleted,
      failed,
    }),
  );
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete the candidates.");
  }
  if (failed > 0) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify({
      status: "fatal",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
