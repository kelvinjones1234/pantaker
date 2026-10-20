"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminActionMenu, type AdminActionMenuItem } from "@/components/admin/AdminActionMenu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, fieldTextareaClass } from "@/components/ui/form-field";
import {
  setAccountStatusAction,
  type AccountActionResult,
} from "@/features/admin/account-actions";
import type { AccountDisplayStatus } from "@/features/admin/account-rules";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const DIALOG_COPY: Record<
  AccountDisplayStatus,
  { title: string; confirm: string; tone: "default" | "danger"; description: string }
> = {
  active: {
    title: "Restore account access",
    confirm: "Restore",
    tone: "default",
    description: "regains normal access and any sign-in ban is lifted.",
  },
  restricted: {
    title: "Restrict account",
    confirm: "Restrict",
    tone: "default",
    description: "keeps signing in but cannot list, message, or record sales.",
  },
  suspended: {
    title: "Suspend account",
    confirm: "Suspend",
    tone: "danger",
    description: "cannot sign in again and is blocked from every write immediately.",
  },
};

export function AccountRestrictionActions({
  userId,
  email,
  status,
}: {
  userId: string;
  email: string | null;
  status: AccountDisplayStatus;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [nextStatus, setNextStatus] = useState<AccountDisplayStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = email ?? userId;

  const items: AdminActionMenuItem[] = [];
  if (status === "active") {
    items.push(
      { key: "restrict", label: "Restrict account", onSelect: () => open("restricted") },
      {
        key: "suspend",
        label: "Suspend account",
        tone: "danger",
        onSelect: () => open("suspended"),
      },
    );
  } else {
    items.push(
      { key: "restrict", label: "Restrict account", onSelect: () => open("restricted") },
      {
        key: "suspend",
        label: "Suspend account",
        tone: "danger",
        onSelect: () => open("suspended"),
      },
      { key: "restore", label: "Restore access", onSelect: () => open("active") },
    );
  }

  function open(next: AccountDisplayStatus) {
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
    const status = nextStatus;
    setError(null);
    startTransition(async () => {
      const result: AccountActionResult = await setAccountStatusAction(
        formData({ user_id: userId, status, reason }),
      );
      if (result.ok) {
        setNextStatus(null);
        setReason("");
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not update this account. Please try again.");
    });
  }

  const copy = nextStatus ? DIALOG_COPY[nextStatus] : null;

  return (
    <>
      <AdminActionMenu items={items} label={`Actions for ${label}`} />

      <ConfirmDialog
        open={nextStatus !== null}
        title={copy?.title ?? "Update account"}
        description={
          copy ? `${label} ${copy.description}` : "Change this account's access."
        }
        confirmLabel={copy?.confirm ?? "Save"}
        tone={copy?.tone ?? "default"}
        pending={pending}
        onConfirm={run}
        onCancel={close}
      >
        <Field
          label="Reason"
          htmlFor={reasonId}
          required
          hint="Recorded in the audit trail with your account."
          error={error ? [error] : undefined}
        >
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Why is this account being changed?"
            className={fieldTextareaClass}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
