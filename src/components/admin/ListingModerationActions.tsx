"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminActionMenu, type AdminActionMenuItem } from "@/components/admin/AdminActionMenu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, fieldTextareaClass } from "@/components/ui/form-field";
import { setListingStatusAction } from "@/features/admin/moderation-actions";
import type { ModerationListingStatus } from "@/features/admin/moderation-rules";

const DIALOG_COPY: Record<
  ModerationListingStatus,
  { title: string; confirm: string; description: string; tone: "default" | "danger" }
> = {
  published: {
    title: "Publish listing",
    confirm: "Publish",
    description: "will become visible in the marketplace.",
    tone: "default",
  },
  rejected: {
    title: "Reject listing",
    confirm: "Reject",
    description: "will stay hidden and the seller can revise and resubmit it.",
    tone: "danger",
  },
  pending_review: {
    title: "Send back to review",
    confirm: "Send back",
    description: "will leave the marketplace until it is reviewed again.",
    tone: "default",
  },
};

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function ListingModerationActions({
  listingId,
  title,
  status,
}: {
  listingId: string;
  title: string;
  status: string;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [nextStatus, setNextStatus] = useState<ModerationListingStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items: AdminActionMenuItem[] = [];
  if (status !== "published") {
    items.push({ key: "publish", label: "Publish listing", onSelect: () => open("published") });
  }
  items.push({
    key: "reject",
    label: "Reject listing",
    tone: "danger",
    onSelect: () => open("rejected"),
  });
  if (status === "published" || status === "rejected") {
    items.push({
      key: "review",
      label: "Send back to review",
      onSelect: () => open("pending_review"),
    });
  }

  function open(next: ModerationListingStatus) {
    setError(null);
    setReason("");
    setNextStatus(next);
  }

  function close() {
    if (pending) return;
    setNextStatus(null);
    setError(null);
  }

  function run() {
    if (!nextStatus) return;
    const statusToSave = nextStatus;
    setError(null);
    startTransition(async () => {
      const result = await setListingStatusAction(
        formData({ listing_id: listingId, status: statusToSave, reason }),
      );
      if (result.ok) {
        setNextStatus(null);
        setReason("");
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not update this listing. Please try again.");
    });
  }

  const copy = nextStatus ? DIALOG_COPY[nextStatus] : null;
  const needsReason = nextStatus === "rejected";

  return (
    <>
      <AdminActionMenu items={items} label={`Moderation actions for ${title}`} />

      <ConfirmDialog
        open={nextStatus !== null}
        title={copy?.title ?? "Moderate listing"}
        description={copy ? `“${title}” ${copy.description}` : "Change this listing's status."}
        confirmLabel={copy?.confirm ?? "Save"}
        tone={copy?.tone ?? "default"}
        pending={pending}
        onConfirm={run}
        onCancel={close}
      >
        {needsReason ? (
          <Field
            label="Rejection reason"
            htmlFor={reasonId}
            required
            hint="Shared with the seller in the moderation record."
            error={error ? [error] : undefined}
          >
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What needs to change before this listing can be published?"
              className={fieldTextareaClass}
            />
          </Field>
        ) : error ? (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
