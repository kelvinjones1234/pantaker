import { Bachs } from "@bachs/sdk";

/**
 * Bachs is configured entirely on the server. Only the secret API key touches
 * the network; no credential is ever exposed to the browser.
 */

export class BachsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BachsConfigurationError";
  }
}

export interface BachsSettings {
  secretKey: string;
  webhookSecret: string;
  apiBaseUrl: string | null;
}

let cachedClient: Bachs | null = null;

/**
 * True only when a checkout and its webhook can actually work end to end: the
 * secret key, the webhook signing secret, and a public canonical URL all exist.
 */
export function isBachsConfigured(): boolean {
  try {
    getBachsSettings();
    publicSiteUrl();
    return true;
  } catch {
    return false;
  }
}

export function getBachsSettings(): BachsSettings {
  const secretKey = process.env.BACHS_SECRET_KEY?.trim();
  const webhookSecret = process.env.BACHS_WEBHOOK_SECRET?.trim();
  if (!secretKey) {
    throw new BachsConfigurationError(
      "Bachs is not configured. Add BACHS_SECRET_KEY on the server.",
    );
  }
  if (!webhookSecret) {
    throw new BachsConfigurationError(
      "Bachs webhooks are not configured. Add BACHS_WEBHOOK_SECRET on the server.",
    );
  }
  return {
    secretKey,
    webhookSecret,
    apiBaseUrl: process.env.BACHS_API_BASE_URL?.trim() || null,
  };
}

export function getBachs(): Bachs {
  if (!cachedClient) {
    const settings = getBachsSettings();
    cachedClient = new Bachs({
      apiKey: settings.secretKey,
      ...(settings.apiBaseUrl ? { baseURL: settings.apiBaseUrl } : {}),
    });
  }
  return cachedClient;
}

/** Bachs returns the sandbox or live host based on the key prefix. */
export function bachsApiBaseUrl(): string {
  const explicit = process.env.BACHS_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const key = process.env.BACHS_SECRET_KEY?.trim() ?? "";
  if (key.startsWith("sk_live_")) return "https://api.bachs.io";
  return "https://sandbox-api.bachs.io";
}

export function publicSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    throw new BachsConfigurationError(
      "NEXT_PUBLIC_SITE_URL is required before a Bachs checkout can be created.",
    );
  }
  try {
    const url = new URL(value);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
      throw new BachsConfigurationError(
        "Bachs needs a public site URL. Set NEXT_PUBLIC_SITE_URL to a public host before taking payments.",
      );
    }
    return url.origin;
  } catch (error) {
    if (error instanceof BachsConfigurationError) throw error;
    throw new BachsConfigurationError("NEXT_PUBLIC_SITE_URL is not a valid URL.");
  }
}
