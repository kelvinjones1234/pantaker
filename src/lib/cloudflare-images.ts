/**
 * Cloudflare Images helpers.
 *
 * Uploads are handed off to Cloudflare with a one-time direct-upload URL so the
 * browser uploads straight to Cloudflare (bypassing the server-action body
 * limit). Only the resulting image id is stored against a listing; delivery is
 * served from imagedelivery.net.
 */
const API_BASE = "https://api.cloudflare.com/client/v4";

export function isCloudflareImagesConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_IMAGES_API_TOKEN &&
      process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH,
  );
}

/** Public delivery URL for a stored Cloudflare image id. */
export function deliveryUrl(imageId: string, variant?: string): string {
  const hash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH;
  if (!hash) {
    throw new Error("NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH is not set.");
  }
  const variantName =
    variant ?? process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT ?? "public";
  return `https://imagedelivery.net/${hash}/${imageId}/${variantName}`;
}

export interface DirectUpload {
  uploadURL: string;
  id: string;
}

export async function createDirectUpload(options?: {
  metadata?: Record<string, string>;
  requireSignedURLs?: boolean;
}): Promise<DirectUpload> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Images is not configured.");
  }

  const form = new FormData();
  if (options?.requireSignedURLs) form.set("requireSignedURLs", "true");
  if (options?.metadata) form.set("metadata", JSON.stringify(options.metadata));

  const response = await fetch(
    `${API_BASE}/accounts/${accountId}/images/v2/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; result?: { uploadURL?: string; id?: string }; errors?: Array<{ message?: string }> }
    | null;

  if (!response.ok || !payload?.success || !payload.result?.uploadURL || !payload.result.id) {
    throw new Error(
      payload?.errors?.[0]?.message ?? "Could not create a Cloudflare upload URL.",
    );
  }

  return { uploadURL: payload.result.uploadURL, id: payload.result.id };
}
