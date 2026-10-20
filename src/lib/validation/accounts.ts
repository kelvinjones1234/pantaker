import { z } from "zod";
import { ACCOUNT_DISPLAY_STATUSES } from "@/features/admin/account-rules";

export const accountStatusSchema = z.object({
  user_id: z.string().uuid("Choose a valid account."),
  status: z.enum(ACCOUNT_DISPLAY_STATUSES, {
    errorMap: () => ({ message: "Choose a valid account status." }),
  }),
  reason: z
    .string()
    .trim()
    .min(5, "Give a reason of at least 5 characters for the audit trail.")
    .max(500, "Keep the reason to 500 characters or fewer."),
});

export type AccountStatusInput = z.infer<typeof accountStatusSchema>;
