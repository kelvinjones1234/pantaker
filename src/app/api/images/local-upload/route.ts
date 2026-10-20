import { NextResponse } from "next/server";
import { getAuthUser } from "@/features/auth/queries";
import { checkAccountCanWrite } from "@/features/accounts/access";
import { isLocalImageMode } from "@/lib/local/flags";
import {
  isLocalImageId,
  saveLocalImage,
  validateLocalImage,
  verifyUploadToken,
} from "@/lib/local/images";

export const runtime = "nodejs";

/** Receives a browser upload and stores it under `.local-uploads/`. */
export async function POST(request: Request) {
  if (!isLocalImageMode()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!isLocalImageId(id)) {
    return NextResponse.json({ error: "Invalid image id." }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  if (!verifyUploadToken(id, user.id, token)) {
    return NextResponse.json({ error: "That upload link is invalid or expired." }, { status: 403 });
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry && typeof entry === "object" && "arrayBuffer" in entry) {
      file = entry as File;
    }
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  const rejection = validateLocalImage(file);
  if (rejection) {
    return NextResponse.json({ error: rejection }, { status: 400 });
  }

  try {
    await saveLocalImage(id, user.id, file);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "Could not save the photo." }, { status: 500 });
  }
}
