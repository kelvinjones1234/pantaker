"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminActionMenu, type AdminActionMenuItem } from "@/components/admin/AdminActionMenu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, fieldTextareaClass } from "@/components/ui/form-field";
import { setReportStatusAction } from "@/features/admin/moderation-actions";
import type { AdminReportStatus } from "@/features/admin/moderation-rules";

const DIALOG_COPY: Record<
  AdminReportStatus,
  { title: string; confirm: string; description: string; tone: "default" | "danger" }
> = {
  open: {
    title: "Reopen report",
    confirm: "Reopen",
    description: "will return to the open queue.",
    tone: "default",
  },
  reviewing: {
    title: "Mark report reviewing",
    confirm: "Mark reviewing",
    description: "will move into active review.",
    tone: "default",
  },
  resolved: {
    title: "Resolve report",
    confirm: "Resolve",
    description: "will be closed as actioned.",
    tone: "default",
  },
  dismissed: {
    title: "Dismiss report",
    confirm: "Dismiss",
    description: "will be closed without action.",
    tone: "danger",
  },
};

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function ReportModerationActions({
  reportId,
  reason,
  status,
}: {
  reportId: string;
  reason: string;
  status: AdminReportStatus;
}) {
  const router = useRouter();
  const noteId = useId();
  const [nextStatus, setNextStatus] = useState<AdminReportStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items: AdminActionMenuItem[] = [];
  if (status === "open") {
    items.push(
      { key: "reviewing", label: "Mark reviewing", onSelect: () => open("reviewing") },
      { key: "resolved", label: "Resolve report", onSelect: () => open("resolved") },
      { key: "dismissed", label: "Dismiss report", tone: "danger", onSelect: () => open("dismissed") },
    );
  } else if (status === "reviewing") {
    items.push(
      { key: "resolved", label: "Resolve report", onSelect: () => open("resolved") },
      { key: "dismissed", label: "Dismiss report", tone: "danger", onSelect: () => open("dismissed") },
      { key: "open", label: "Reopen report", onSelect: () => open("open") },
    );
  } else {
    items.push(
      { key: "reviewing", label: "Reopen as reviewing", onSelect: () => open("reviewing") },
      { key: "open", label: "Reopen as open", onSelect: () => open("open") },
    );
  }

  function open(next: AdminReportStatus) {
    setError(null);
    setNote("");
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
      const result = await setReportStatusAction(
        formData({ report_id: reportId, status: statusToSave, note }),
      );
      if (result.ok) {
        setNextStatus(null);
        setNote("");
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not update this report. Please try again.");
    });
  }

  const copy = nextStatus ? DIALOG_COPY[nextStatus] : null;
  const needsNote = nextStatus === "resolved" || nextStatus === "dismissed";

  return (
    <>
      <AdminActionMenu items={items} label={`Actions for report: ${reason}`} />

      <ConfirmDialog
        open={nextStatus !== null}
        title={copy?.title ?? "Update report"}
        description={copy ? `This report ${copy.description}` : "Change this report's status."}
        confirmLabel={copy?.confirm ?? "Save"}
        tone={copy?.tone ?? "default"}
        pending={pending}
        onConfirm={run}
        onCancel={close}
      >
        {needsNote ? (
          <Field
            label="Decision note"
            htmlFor={noteId}
            required
            hint="Recorded in the moderation audit trail."
            error={error ? [error] : undefined}
          >
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What was decided and why?"
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
