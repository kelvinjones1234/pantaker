import { uploadLimits } from "@/config/site";

export type UploadPurpose = "listing" | "profile";

export interface UploadOptions {
  purpose: UploadPurpose;
  listingId?: string;
}

interface UploadResponse {
  key?: string;
  error?: string;
}

/** Human-readable rejection reason, or null when the file is acceptable. */
export function validateImageFile(
  file: File,
  acceptedCount: number,
): string | null {
  if (acceptedCount >= uploadLimits.maxImages) {
    return `You can add up to ${uploadLimits.maxImages} photos.`;
  }
  if (
    !(uploadLimits.allowedMimeTypes as readonly string[]).includes(file.type)
  ) {
    return "Use a JPG, PNG, WebP, or AVIF image.";
  }
  if (file.size > uploadLimits.maxBytes) {
    return `Each photo must be under ${Math.round(
      uploadLimits.maxBytes / (1024 * 1024),
    )}MB.`;
  }
  return null;
}

function parseResponse(xhr: XMLHttpRequest): UploadResponse | null {
  try {
    return JSON.parse(xhr.responseText) as UploadResponse;
  } catch {
    return null;
  }
}

/** Upload one processed image through the authenticated server route. */
export function uploadImageFile(
  file: File,
  options: UploadOptions,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/images/upload");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const payload = parseResponse(xhr);
      if (xhr.status >= 200 && xhr.status < 300 && payload?.key) {
        onProgress(100);
        resolve(payload.key);
        return;
      }
      reject(
        new Error(payload?.error ?? "Upload failed. Please try again."),
      );
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    const form = new FormData();
    form.append("file", file);
    form.append("purpose", options.purpose);
    if (options.listingId) form.append("listingId", options.listingId);
    xhr.send(form);
  });
}

/** Best-effort removal of a newly uploaded photo that was never saved. */
export async function deleteUploadedImage(key: string): Promise<void> {
  try {
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch {
    // The server-side cleanup path will handle abandoned objects later.
  }
}
