import { z } from "zod";
import { messagingLimits } from "@/config/site";

const MAX = messagingLimits.maxBodyLength;

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Write a message.")
  .max(MAX, `Messages are limited to ${MAX} characters.`);

/** Start a conversation from a listing. The listing id is the only context the
 * browser supplies; the buyer and seller ids are derived from the session and
 * the listing row. */
export const startConversationSchema = z.object({
  listing_id: z.string().uuid("Choose a listing."),
  body: z
    .string()
    .trim()
    .min(5, "Tell the seller what you need (min 5 characters).")
    .max(MAX, `Messages are limited to ${MAX} characters.`),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;

/** Reply in an existing conversation. */
export const sendMessageSchema = z.object({
  inquiry_id: z.string().uuid("That conversation could not be found."),
  body: messageBodySchema,
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Report the other participant of a conversation. The reported user is resolved
 * server-side from the conversation, so the client cannot report an arbitrary
 * user id.
 */
export const conversationReportSchema = z.object({
  inquiry_id: z.string().uuid("That conversation could not be found."),
  reason: z.string().trim().min(3, "Choose a reason.").max(120),
  details: z.string().trim().min(10, "Add a short explanation.").max(2000),
});

export type ConversationReportInput = z.infer<typeof conversationReportSchema>;

/** Reasons offered in the report control — plain and specific, no invented ones. */
export const REPORT_REASONS = [
  "Spam or scam",
  "Abusive or harassing messages",
  "Trying to move the deal off Pantaker",
  "Suspicious or fake listing",
  "Something else",
] as const;
