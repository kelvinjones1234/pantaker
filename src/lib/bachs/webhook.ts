import { webhooks, type WebhookEvent } from "@bachs/sdk";
import { getBachsSettings } from "@/lib/bachs/config";

export class BachsWebhookVerificationError extends Error {
  constructor(message = "Invalid Bachs webhook signature.") {
    super(message);
    this.name = "BachsWebhookVerificationError";
  }
}

/**
 * Verify the exact raw request bytes before any parsing or business effect.
 * This helper never logs the payload or the signing secret.
 */
export function verifyBachsWebhook(
  rawBody: string,
  headers: Headers,
): WebhookEvent {
  const { webhookSecret } = getBachsSettings();
  try {
    return webhooks.constructEvent(rawBody, headers, webhookSecret);
  } catch {
    throw new BachsWebhookVerificationError();
  }
}
