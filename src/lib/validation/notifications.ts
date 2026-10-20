import { z } from "zod";

/**
 * Notification preference input. The settings form submits checkboxes: a checked
 * box sends "on", an unchecked box is absent. Anything that is not a truthy form
 * value is treated as off, so a missing field can never silently re-enable a
 * channel the user switched off.
 */
const checkbox = z.preprocess(
  (value) => value === true || value === "on" || value === "true" || value === "1",
  z.boolean(),
);

export const notificationPreferencesSchema = z.object({
  messages: checkbox,
  sale_updates: checkbox,
  listing_updates: checkbox,
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
