import { NextResponse } from "next/server";
import { getAuthUser } from "@/features/auth/queries";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { getPrisma } from "@/lib/prisma";
import { createDirectUpload, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";
import { isLocalImageMode } from "@/lib/local/flags";
import { createUploadToken, newLocalImageId } from "@/lib/local/images";

const UPLOADS_PER_HOUR = 30;
const MAX_METADATA_KEYS = 8;
const MAX_METADATA_VALUE_LENGTH = 200;

function sanitizeMetadata(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, entry]) => /^[a-zA-Z0-9_-]{1,40}$/.test(key) && typeof entry === "string")
    .slice(0, MAX_METADATA_KEYS)
    .map(([key, entry]) => [key, (entry as string).slice(0, MAX_METADATA_VALUE_LENGTH)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Issues a direct-upload ticket. In production the browser uploads to
 * Cloudflare; when local image mode is enabled it uploads to our local image route. Access
 * and rate limits are checked here because the file bypasses server actions.
 */
export async function POST(request: Request) {
  if (!isCloudflareImagesConfigured()) {
    return NextResponse.json(
      { error: "Image uploads are not configured yet." },
      { status: 501 },
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const prisma = getPrisma();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  let count: number;
  try {
    count = await prisma.uploadRequest.count({
      where: { user_id: user.id, created_at: { gte: since } },
    });
  } catch {
    return NextResponse.json(
      { error: "Upload limits are unavailable. Try again shortly." },
      { status: 503 },
    );
  }
  if (count >= UPLOADS_PER_HOUR) {
    return NextResponse.json(
      { error: "You have reached the hourly upload limit. Try again later." },
      { status: 429 },
    );
  }

  let metadata: Record<string, string> | undefined;
  try {
    const body = (await request.json()) as { metadata?: unknown };
    metadata = sanitizeMetadata(body?.metadata);
  } catch {
    // No body / not JSON — metadata is optional.
  }

  try {
    const upload = isLocalImageMode()
      ? (() => {
          const id = newLocalImageId();
          return {
            id,
            uploadURL: `/api/images/local-upload?id=${encodeURIComponent(id)}&token=${encodeURIComponent(
              createUploadToken(id, user.id),
            )}`,
          };
        })()
      : await createDirectUpload({
          // Server-derived userId must win over any client-supplied metadata.
          metadata: { ...metadata, userId: user.id },
        });

    try {
      await prisma.uploadRequest.create({ data: { user_id: user.id } });
    } catch {
      return NextResponse.json(
        { error: "Could not record this upload. Try again shortly." },
        { status: 503 },
      );
    }

    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the upload." },
      { status: 502 },
    );
  }
}
