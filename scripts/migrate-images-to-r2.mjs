import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

config({ quiet: true });

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_EDGE = 12_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const typeIndex = args.indexOf("--type");
const onlyType = typeIndex >= 0 ? args[typeIndex + 1] : null;
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;

const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY?.trim();
const endpoint = process.env.CLOUDFLARE_R2_BUCKET_ENDPOINT?.trim();
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const legacyDeliveryHash =
  process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH?.trim();
const localUploadDir = process.env.LOCAL_UPLOAD_DIR?.trim() || ".local-uploads";
const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
const allowedRemoteHosts = new Set(["imagedelivery.net", "images.unsplash.com"]);
if (publicDomain) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(publicDomain) ? publicDomain : `https://${publicDomain}`,
    );
    allowedRemoteHosts.add(url.hostname.toLowerCase());
  } catch {
    // The storage check reports a malformed domain before any object write.
  }
}

if (!databaseUrl) {
  console.error("Missing DATABASE_URL or DIRECT_URL.");
  process.exit(1);
}
if (!dryRun && (!bucket || !accessKeyId || !secretAccessKey || !endpoint)) {
  console.error(
    "Missing Cloudflare R2 credentials. Set CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, and CLOUDFLARE_R2_BUCKET_ENDPOINT.",
  );
  process.exit(1);
}

const client = dryRun
  ? null
  : new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

function isR2Reference(value) {
  return /^(listings|profiles|categories|admin|media|migrated|private)\//.test(
    value,
  );
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeKey(kind, resourceId, source) {
  if (kind === "listing") {
    return `migrated/listings/${resourceId}/${digest(source)}.webp`;
  }
  return `migrated/profiles/${resourceId}/${digest(source)}.webp`;
}

async function sourceBytes(reference) {
  if (reference.startsWith("data:image/")) {
    const comma = reference.indexOf(",");
    if (comma < 0) throw new Error("Malformed data image.");
    const header = reference.slice(0, comma);
    if (!header.includes(";base64")) throw new Error("Unsupported data image.");
    return Buffer.from(reference.slice(comma + 1), "base64");
  }

  if (reference.startsWith("local-")) {
    const file = path.join(path.resolve(localUploadDir), reference);
    return readFile(file);
  }

  let url = reference;
  if (!/^https?:\/\//i.test(reference)) {
    if (!legacyDeliveryHash) {
      throw new Error(
        "Legacy Cloudflare Images ID requires NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH.",
      );
    }
    url = `https://imagedelivery.net/${encodeURIComponent(
      legacyDeliveryHash,
    )}/${encodeURIComponent(reference)}/public`;
  }

  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !allowedRemoteHosts.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error("Legacy image URL host is not trusted.");
  }

  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: { "user-agent": "PantakerImageMigration/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}.`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) throw new Error("Source image is too large.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error("Source image is too large.");
  return bytes;
}

async function processImage(input, kind) {
  if (input.byteLength === 0) throw new Error("Source image is empty.");
  if (input.byteLength > MAX_BYTES) throw new Error("Source image is too large.");

  const metadata = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    animated: false,
  }).metadata();

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error(`Unsupported image format: ${metadata.format ?? "unknown"}.`);
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 16 || height < 16) throw new Error("Image is too small.");
  if (width > MAX_EDGE || height > MAX_EDGE) {
    throw new Error("Image dimensions are too large.");
  }
  if (width * height > MAX_PIXELS) throw new Error("Image has too many pixels.");

  const size = kind === "profile" ? 512 : 2400;
  return sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })
    .rotate()
    .resize({
      width: size,
      height: size,
      fit: kind === "profile" ? "cover" : "inside",
      withoutEnlargement: kind !== "profile",
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

async function objectExists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function migrateOne(pool, kind, row) {
  const source = row.storage_path;
  if (!source || isR2Reference(source)) {
    return { status: "skipped", source };
  }

  const key = safeKey(kind, row.resource_id, source);
  if (dryRun) {
    return { status: "dry-run", source, key };
  }

  const bytes = await sourceBytes(source);
  const processed = await processImage(bytes, kind);

  if (!(await objectExists(key))) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: processed,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    if (!(await objectExists(key))) {
      throw new Error("Uploaded object could not be verified.");
    }
  }

  if (kind === "listing") {
    const result = await pool.query(
      "update public.listing_images set storage_path = $1 where id = $2 and storage_path = $3",
      [key, row.id, source],
    );
    if (result.rowCount !== 1) {
      throw new Error("Database row changed during migration; retry.");
    }
  } else {
    const result = await pool.query(
      "update public.profiles set avatar_path = $1 where id = $2 and avatar_path = $3",
      [key, row.id, source],
    );
    if (result.rowCount !== 1) {
      throw new Error("Database row changed during migration; retry.");
    }
  }

  return { status: "migrated", source, key };
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  let rows = [];
  try {
    if (!onlyType || onlyType === "listing") {
      const result = await pool.query(
        `select li.id, li.listing_id as resource_id, li.storage_path
           from public.listing_images li
          order by li.created_at asc
          limit $1`,
        [Number.isFinite(limit) ? limit : 100000],
      );
      rows.push(...result.rows.map((row) => ({ kind: "listing", ...row })));
    }
    if (!onlyType || onlyType === "profile") {
      const result = await pool.query(
        `select p.id, p.id as resource_id, p.avatar_path as storage_path
           from public.profiles p
          where p.avatar_path is not null
          order by p.created_at asc
          limit $1`,
        [Number.isFinite(limit) ? limit : 100000],
      );
      rows.push(...result.rows.map((row) => ({ kind: "profile", ...row })));
    }
  } finally {
    await pool.end();
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const workPool = new pg.Pool({ connectionString: databaseUrl });

  try {
    for (const row of rows) {
      try {
        const result = await migrateOne(workPool, row.kind, row);
        if (result.status === "migrated") migrated += 1;
        else if (result.status === "skipped") skipped += 1;
        console.log(
          JSON.stringify({
            type: row.kind,
            id: row.id,
            ...result,
          }),
        );
      } catch (error) {
        failed += 1;
        console.error(
          JSON.stringify({
            type: row.kind,
            id: row.id,
            status: "failed",
            source: row.storage_path,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  } finally {
    await workPool.end();
  }

  console.log(
    JSON.stringify({ dryRun, migrated, skipped, failed, total: rows.length }),
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "fatal",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
