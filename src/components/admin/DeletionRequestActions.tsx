"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminActionMenu, type AdminActionMenuItem } from "@/components/admin/AdminActionMenu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  dismissDeletionRequestAction,
  processDeletionRequestAction,
} from "@/features/admin/deletion-actions";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function DeletionRequestActions({
  userId,
  label,
}: {
  userId: string;
  label: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"delete" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items: AdminActionMenuItem[] = [
    {
      key: "delete",
      label: "Delete account",
      tone: "danger",
      onSelect: () => {
        setError(null);
        setMode("delete");
      },
    },
    {
      key: "dismiss",
      label: "Dismiss request",
      onSelect: () => {
        setError(null);
        setMode("dismiss");
      },
    },
  ];

  function close() {
    if (pending) return;
    setMode(null);
    setError(null);
  }

  function run() {
    if (!mode) return;
    const action = mode;
    setError(null);
    startTransition(async () => {
      const result =
        action === "delete"
          ? await processDeletionRequestAction(formData({ user_id: userId }))
          : await dismissDeletionRequestAction(formData({ user_id: userId }));
      if (result.ok) {
        setMode(null);
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not update this request. Please try again.");
    });
  }

  return (
    <>
      <AdminActionMenu items={items} label={`Deletion request actions for ${label}`} />
      <ConfirmDialog
        open={mode !== null}
        title={mode === "delete" ? "Delete this account" : "Dismiss this request"}
        description={
          mode === "delete"
            ? `${label} and their marketplace data will be permanently deleted. This cannot be undone.`
            : `${label} will be removed from the deletion queue. Their account stays active.`
        }
        confirmLabel={mode === "delete" ? "Delete account" : "Dismiss request"}
        tone={mode === "delete" ? "danger" : "default"}
        pending={pending}
        onConfirm={run}
        onCancel={close}
      >
        {error && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
