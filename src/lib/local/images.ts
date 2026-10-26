import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Development-only image storage. Files live under `.local-uploads/` on the
 * machine running `next dev`; the id format matches the existing
 * `storedImageIdSchema` so database rows stay compatible.
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

export async function saveLocalImageBytes(
  id: string,
  userId: string,
  bytes: Buffer,
  file: { mime: string; name: string },
): Promise<void> {
  const directory = localImagesDirectory();
  await mkdir(directory, { recursive: true });
  const sidecar: Sidecar = {
    mime: file.mime || "application/octet-stream",
    name: file.name.slice(0, 200),
    size: bytes.byteLength,
    userId,
  };
  await writeFile(path.join(directory, id), bytes);
  await writeFile(path.join(directory, `${id}.json`), JSON.stringify(sidecar));
}

export async function saveLocalImage(
  id: string,
  userId: string,
  file: File,
): Promise<void> {
  const bytes = Buffer.from(await file.arrayBuffer());
  await saveLocalImageBytes(id, userId, bytes, {
    mime: file.type,
    name: file.name,
  });
}

export async function localImageExists(id: string): Promise<boolean> {
  if (!isLocalImageId(id)) return false;
  try {
    await readFile(path.join(localImagesDirectory(), id));
    return true;
  } catch {
    return false;
  }
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
