import { NextResponse } from "next/server";
import { isLocalImageMode } from "@/lib/local/flags";
import { readLocalImage } from "@/lib/local/images";

export const runtime = "nodejs";

/** Serves an image stored under `.local-uploads/` during local development. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isLocalImageMode()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await context.params;
  const image = await readLocalImage(id);
  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
