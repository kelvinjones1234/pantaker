import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildPublicObjectUrl,
  normalizePublicBaseUrl,
  assertSafeObjectKey,
} from "@/lib/storage/object-keys";
import {
  StorageConfigError,
  StorageOperationError,
} from "@/lib/storage/errors";

export interface R2CredentialsConfig {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface R2StorageDependencies {
  config?: R2CredentialsConfig;
  client?: S3Client;
}

const REQUIRED_KEYS = [
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_BUCKET_ENDPOINT",
  "CLOUDFLARE_R2_ACCESS_KEY",
  "CLOUDFLARE_R2_SECRET_KEY",
] as const;

function requiredValue(name: string, source: Record<string, string | undefined>): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new StorageConfigError(
      `Image storage is not configured: ${name} is missing.`,
    );
  }
  return value;
}

function validateEndpoint(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new StorageConfigError(
      "CLOUDFLARE_R2_BUCKET_ENDPOINT is not a valid URL.",
    );
  }

  if (url.protocol !== "https:") {
    throw new StorageConfigError(
      "CLOUDFLARE_R2_BUCKET_ENDPOINT must use https.",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new StorageConfigError(
      "CLOUDFLARE_R2_BUCKET_ENDPOINT must be a plain storage endpoint.",
    );
  }

  return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
}

export function loadR2Credentials(
  source: Record<string, string | undefined> = process.env,
): R2CredentialsConfig {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]?.trim());
  if (missing.length > 0) {
    throw new StorageConfigError(
      `Image storage is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return {
    bucket: requiredValue("CLOUDFLARE_R2_BUCKET", source),
    endpoint: validateEndpoint(
      requiredValue("CLOUDFLARE_R2_BUCKET_ENDPOINT", source),
    ),
    accessKeyId: requiredValue("CLOUDFLARE_R2_ACCESS_KEY", source),
    secretAccessKey: requiredValue("CLOUDFLARE_R2_SECRET_KEY", source),
  };
}

export function getPublicBaseUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  const raw = source.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
  if (!raw) {
    throw new StorageConfigError(
      "Image delivery is not configured: NEXT_PUBLIC_R2_PUBLIC_DOMAIN is missing.",
    );
  }

  try {
    return normalizePublicBaseUrl(raw);
  } catch (error) {
    throw new StorageConfigError(
      error instanceof Error
        ? error.message
        : "NEXT_PUBLIC_R2_PUBLIC_DOMAIN is misconfigured.",
    );
  }
}

export function isR2Configured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  try {
    loadR2Credentials(source);
    getPublicBaseUrl(source);
    return true;
  } catch {
    return false;
  }
}

export function createR2Client(config: R2CredentialsConfig): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

let cachedClient: S3Client | null = null;
let cachedFingerprint = "";

function clientFingerprint(config: R2CredentialsConfig): string {
  return `${config.endpoint}\u0000${config.accessKeyId}\u0000${config.secretAccessKey}`;
}

export function getR2Client(): S3Client {
  const config = loadR2Credentials();
  const fingerprint = clientFingerprint(config);
  if (!cachedClient || cachedFingerprint !== fingerprint) {
    cachedClient = createR2Client(config);
    cachedFingerprint = fingerprint;
  }
  return cachedClient;
}

function resolveDependencies(dependencies: R2StorageDependencies = {}) {
  const config = dependencies.config ?? loadR2Credentials();
  const client =
    dependencies.client ??
    (dependencies.config ? createR2Client(config) : getR2Client());
  return { config, client };
}

function operationError(operation: string, error: unknown): StorageOperationError {
  const status =
    typeof error === "object" && error && "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode
      : undefined;
  return new StorageOperationError(
    status
      ? `Image storage ${operation} failed (HTTP ${status}).`
      : `Image storage ${operation} failed.`,
    error,
  );
}

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}

export async function putObject(
  input: PutObjectInput,
  dependencies: R2StorageDependencies = {},
): Promise<void> {
  assertSafeObjectKey(input.key);
  const { config, client } = resolveDependencies(dependencies);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl:
          input.cacheControl ?? "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    throw operationError("upload", error);
  }
}

export async function deleteObject(
  key: string,
  dependencies: R2StorageDependencies = {},
): Promise<void> {
  assertSafeObjectKey(key);
  const { config, client } = resolveDependencies(dependencies);
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (error) {
    throw operationError("delete", error);
  }
}

export interface ObjectHead {
  size: number;
  contentType: string | null;
  cacheControl: string | null;
}

export async function headObject(
  key: string,
  dependencies: R2StorageDependencies = {},
): Promise<ObjectHead | null> {
  assertSafeObjectKey(key);
  const { config, client } = resolveDependencies(dependencies);
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
      cacheControl: result.CacheControl ?? null,
    };
  } catch (error) {
    const status =
      typeof error === "object" && error && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    if (status === 404) return null;
    throw operationError("lookup", error);
  }
}

export async function getObjectBytes(
  key: string,
  maxBytes: number,
  dependencies: R2StorageDependencies = {},
): Promise<Buffer> {
  assertSafeObjectKey(key);
  const { config, client } = resolveDependencies(dependencies);

  let result;
  try {
    result = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (error) {
    throw operationError("download", error);
  }

  const declaredSize = result.ContentLength;
  if (typeof declaredSize === "number" && declaredSize > maxBytes) {
    throw new StorageOperationError("The stored image is too large to process.");
  }

  const body = result.Body as
    | (AsyncIterable<Uint8Array> & { destroy?: () => void })
    | undefined;
  if (!body) throw new StorageOperationError("The stored image is empty.");

  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of body) {
      total += chunk.byteLength;
      if (total > maxBytes) {
        body.destroy?.();
        throw new StorageOperationError(
          "The stored image is too large to process.",
        );
      }
      chunks.push(Buffer.from(chunk));
    }
  } catch (error) {
    if (error instanceof StorageOperationError) throw error;
    throw operationError("download", error);
  }

  return Buffer.concat(chunks, total);
}

export async function presignGetObject(
  key: string,
  expiresInSeconds = 300,
  dependencies: R2StorageDependencies = {},
): Promise<string> {
  assertSafeObjectKey(key);
  const { config, client } = resolveDependencies(dependencies);
  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { expiresIn: Math.min(Math.max(expiresInSeconds, 30), 3600) },
    );
  } catch (error) {
    throw operationError("signing", error);
  }
}

export function publicObjectUrl(
  key: string,
  source: Record<string, string | undefined> = process.env,
): string {
  return buildPublicObjectUrl(key, getPublicBaseUrl(source));
}
