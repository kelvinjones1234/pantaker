import { uploadLimits } from "@/config/site";

/**
 * Client-side helpers for the Cloudflare Images direct-upload flow.
 *
 * The browser asks our API route for a one-time upload URL, then PUTs the file
 * straight to Cloudflare. The server action only ever receives the resulting
 * image id — the file never passes through our server action body.
 */

export interface DirectUploadTicket {
  uploadURL: string;
  id: string;
}

export async function requestDirectUpload(
  metadata?: Record<string, string>,
): Promise<DirectUploadTicket> {
  const response = await fetch("/api/images/direct-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { uploadURL?: string; id?: string; error?: string }
    | null;

  if (!response.ok || !payload?.uploadURL || !payload?.id) {
    throw new Error(payload?.error ?? "Could not start the photo upload.");
  }

  return { uploadURL: payload.uploadURL, id: payload.id };
}

/** Human-readable rejection reason, or null when the file is acceptable. */
export function validateImageFile(file: File, acceptedCount: number): string | null {
  if (acceptedCount >= uploadLimits.maxImages) {
    return `You can add up to ${uploadLimits.maxImages} photos.`;
  }
  if (!(uploadLimits.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > uploadLimits.maxBytes) {
    return `Each photo must be under ${Math.round(uploadLimits.maxBytes / (1024 * 1024))}MB.`;
  }
  return null;
}

/** Upload a single file to a Cloudflare direct-upload URL, reporting progress. */
export function uploadToCloudflare(
  uploadURL: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadURL);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
