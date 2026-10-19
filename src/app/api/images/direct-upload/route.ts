import { NextResponse } from "next/server";
import { getAuthUser } from "@/features/auth/queries";
import { createDirectUpload, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";

/**
 * Issues a Cloudflare Images direct-upload URL. The client then PUTs the file
 * to that URL directly; we only persist the returned image id.
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

  let metadata: Record<string, string> | undefined;
  try {
    const body = (await request.json()) as { metadata?: Record<string, string> };
    if (body?.metadata && typeof body.metadata === "object") {
      metadata = body.metadata;
    }
  } catch {
    // No body / not JSON — metadata is optional.
  }

  try {
    const upload = await createDirectUpload({
      metadata: { userId: user.id, ...metadata },
    });
    return NextResponse.json(upload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the upload." },
      { status: 502 },
    );
  }
}
