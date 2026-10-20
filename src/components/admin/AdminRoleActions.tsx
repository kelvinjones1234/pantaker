"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { fieldSelectClass } from "@/components/ui/form-field";
import { grantAdminRoleAction, revokeAdminRoleAction } from "@/features/admin/actions";
import { ADMIN_ROLE_LABELS, ADMIN_ROLES, type AdminRole } from "@/features/admin/roles";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function AdminRoleActions({
  userId,
  email,
  role,
}: {
  userId: string;
  email: string | null;
  role: AdminRole;
}) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState<AdminRole>(role);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = email ?? userId;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await grantAdminRoleAction(
        formData({ user_id: userId, role: nextRole }),
      );
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not save this admin role. Please try again.");
    });
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAdminRoleAction(formData({ user_id: userId }));
      if (result.ok) {
        setConfirmingRevoke(false);
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not revoke admin access. Please try again.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label htmlFor={`role-${userId}`} className="sr-only">
          Role for {label}
        </label>
        <select
          id={`role-${userId}`}
          value={nextRole}
          onChange={(event) => setNextRole(event.target.value as AdminRole)}
          disabled={pending}
          className={`${fieldSelectClass} h-9 w-[150px] text-[12px]`}
        >
          {ADMIN_ROLES.map((option) => (
            <option key={option} value={option}>
              {ADMIN_ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending || nextRole === role}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-4 text-[12px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmingRevoke(true);
          }}
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[12px] font-semibold text-[var(--color-error)] transition-colors duration-150 hover:border-[var(--color-error)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
      {error && !confirmingRevoke && (
        <p role="alert" className="max-w-[260px] text-right text-[11px] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmingRevoke}
        title="Revoke admin access"
        description={`${label} will lose all admin tools immediately.`}
        confirmLabel="Revoke access"
        tone="danger"
        pending={pending}
        onConfirm={revoke}
        onCancel={() => {
          if (!pending) {
            setConfirmingRevoke(false);
            setError(null);
          }
        }}
      >
        {error && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
