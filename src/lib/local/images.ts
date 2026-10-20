import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadLimits } from "@/config/site";

/**
 * Development-only image storage. Files live under `.local-uploads/` on the
 * machine running `next dev`; the id format matches the existing
 * `cloudflareImageIdSchema` so database rows stay compatible.
 */

const ID_PATTERN =
  /^local-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Sidecar {
  mime: string;
  name: string;
  size: number;
  userId: string;
}

export function localImagesDirectory(): string {
  return path.resolve(process.env.LOCAL_UPLOAD_DIR ?? ".local-uploads");
}

export function isLocalImageId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function newLocalImageId(): string {
  return `local-${crypto.randomUUID()}`;
}

export function localImageUrl(id: string): string {
  return `/api/local-images/${encodeURIComponent(id)}`;
}

function secret(): string {
  return process.env.LOCAL_UPLOAD_SECRET ?? "pantaker-local-dev-upload-secret";
}

function signature(id: string, userId: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${id}:${userId}:${expires}`).digest("hex");
}

export function createUploadToken(id: string, userId: string, ttlMs = 15 * 60 * 1000): string {
  const expires = Date.now() + ttlMs;
  return `${expires}.${signature(id, userId, expires)}`;
}

export function verifyUploadToken(id: string, userId: string, token: string): boolean {
  const [expiresRaw, provided] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now() || !provided) return false;
  const expected = signature(id, userId, expires);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export function validateLocalImage(file: File): string | null {
  if (!(uploadLimits.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > uploadLimits.maxBytes) {
    return `Each photo must be under ${Math.round(
      uploadLimits.maxBytes / (1024 * 1024),
    )}MB.`;
  }
  return null;
}

export async function saveLocalImage(
  id: string,
  userId: string,
  file: File,
): Promise<void> {
  const directory = localImagesDirectory();
  await mkdir(directory, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  const sidecar: Sidecar = {
    mime: file.type || "application/octet-stream",
    name: file.name.slice(0, 200),
    size: bytes.byteLength,
    userId,
  };
  await writeFile(path.join(directory, id), bytes);
  await writeFile(path.join(directory, `${id}.json`), JSON.stringify(sidecar));
}

export async function readLocalImage(
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!isLocalImageId(id)) return null;
  const directory = localImagesDirectory();
  try {
    const [bytes, metaRaw] = await Promise.all([
      readFile(path.join(directory, id)),
      readFile(path.join(directory, `${id}.json`), "utf8").catch(() => null),
    ]);
    let mime = "application/octet-stream";
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as Partial<Sidecar>;
        if (typeof meta.mime === "string") mime = meta.mime;
      } catch {
        // Fall back to a generic content type.
      }
    }
    return { bytes, mime };
  } catch {
    return null;
  }
}

export async function deleteLocalImage(id: string): Promise<boolean> {
  if (!isLocalImageId(id)) return false;
  const directory = localImagesDirectory();
  try {
    await unlink(path.join(directory, id));
  } catch {
    // Already gone.
  }
  try {
    await unlink(path.join(directory, `${id}.json`));
  } catch {
    // Already gone.
  }
  return true;
}
