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
const endpoint = process.env.CLOUDFLARE_R2_BUCKET_ENDPOINT?.trim();
const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
const imageMode = process.env.PANTAKER_IMAGE_MODE?.trim() || "r2";

const missing = [
  ["CLOUDFLARE_R2_BUCKET", bucket],
  ["CLOUDFLARE_R2_ACCESS_KEY", accessKeyId],
  ["CLOUDFLARE_R2_SECRET_KEY", secretAccessKey],
  ["CLOUDFLARE_R2_BUCKET_ENDPOINT", endpoint],
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

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const base = /^https?:\/\//i.test(publicDomain)
  ? publicDomain.replace(/\/+$/, "")
  : `https://${publicDomain.replace(/\/+$/, "")}`;
const testKey = `healthcheck/pantaker-${randomUUID()}.txt`;
let testObjectExists = false;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: "Pantaker R2 write check",
      ContentType: "text/plain",
    }),
  );
  testObjectExists = true;

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  testObjectExists = false;

  console.log("R2 credentials are valid for write and delete.");
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
