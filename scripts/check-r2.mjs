import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

config({ quiet: true });

const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY?.trim();
const rawEndpoint = process.env.CLOUDFLARE_R2_BUCKET_ENDPOINT?.trim();
const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
const imageMode = process.env.PANTAKER_IMAGE_MODE?.trim() || "r2";

const missing = [
  ["CLOUDFLARE_R2_BUCKET", bucket],
  ["CLOUDFLARE_R2_ACCESS_KEY", accessKeyId],
  ["CLOUDFLARE_R2_SECRET_KEY", secretAccessKey],
  ["CLOUDFLARE_R2_BUCKET_ENDPOINT", rawEndpoint],
  ["NEXT_PUBLIC_R2_PUBLIC_DOMAIN", publicDomain],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing R2 environment values: ${missing.join(", ")}.`);
  process.exit(1);
}

if (imageMode === "local") {
  console.error(
    "PANTAKER_IMAGE_MODE=local is set. Set it to r2 (or remove it) to use R2.",
  );
  process.exit(1);
}

let endpoint;
try {
  const parsed = new URL(rawEndpoint);
  if (parsed.protocol !== "https:") throw new Error("HTTPS is required.");
  endpoint = parsed.origin;
} catch {
  console.error(
    "CLOUDFLARE_R2_BUCKET_ENDPOINT must be a valid HTTPS endpoint. Do not include a bucket path.",
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const base = /^https?:\/\//i.test(publicDomain)
  ? publicDomain.replace(/\/+$/, "")
  : `https://${publicDomain.replace(/\/+$/, "")}`;
const testKey = `healthcheck/pantaker-${randomUUID()}.txt`;
const testBody = "Pantaker R2 write and public read check";
let testObjectExists = false;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testBody,
      ContentType: "text/plain",
    }),
  );
  testObjectExists = true;

  let publicResponse;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    publicResponse = await fetch(`${base}/${testKey}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (publicResponse.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  if (!publicResponse?.ok) {
    throw new Error(
      `S3 write succeeded, but public delivery returned HTTP ${publicResponse?.status ?? "unknown"}. Enable Public Access for the bucket or point NEXT_PUBLIC_R2_PUBLIC_DOMAIN at the correct public domain.`,
    );
  }

  const served = await publicResponse.text();
  if (served !== testBody) {
    throw new Error(
      "Public delivery returned different content than the uploaded object. Check NEXT_PUBLIC_R2_PUBLIC_DOMAIN.",
    );
  }

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  testObjectExists = false;

  console.log("R2 credentials are valid for write and delete.");
  console.log("R2 public delivery is valid for read.");
  console.log(`Bucket: ${bucket}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Public base URL: ${base}`);
  console.log(`Upload object key prefixes: listings/, profiles/, migrated/`);
} catch (error) {
  if (testObjectExists) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
    } catch {
      // Leave the healthcheck object for manual cleanup.
    }
  }
  console.error(
    `R2 check failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
