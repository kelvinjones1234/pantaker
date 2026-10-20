"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCategoryAction,
  setCategoryActiveAction,
  type CategoryActionResult,
} from "@/features/admin/category-actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const secondaryButton =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-40";

export function CategoryStatusActions({
  id,
  name,
  isActive,
  listingCount,
  childCount,
}: {
  id: string;
  name: string;
  isActive: boolean;
  listingCount: number;
  childCount: number;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);

  const blocked = listingCount > 0 || childCount > 0;

  function run(action: () => Promise<CategoryActionResult>, after?: () => void) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.error ?? "Could not complete that change. Try again.");
          return;
        }
        after?.();
        router.refresh();
      } finally {
        pendingRef.current = false;
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={secondaryButton}
          disabled={pending}
          onClick={() =>
            run(() =>
              setCategoryActiveAction(
                formData({ category_id: id, is_active: String(!isActive) }),
              ),
            )
          }
        >
          {isActive ? "Disable category" : "Enable category"}
        </button>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[var(--color-error)] bg-[var(--color-pure-white)] px-4 text-[13px] font-semibold text-[var(--color-error)] transition-colors duration-150 hover:bg-[var(--color-error-bg)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pending || blocked}
          onClick={() => setConfirmOpen(true)}
        >
          Delete category
        </button>
      </div>

      {blocked && (
        <p className="text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          {childCount > 0
            ? "This category has subcategories. Move or delete them before deleting it."
            : `This category is used by ${listingCount} listing${
                listingCount === 1 ? "" : "s"
              }. Disable it instead, or move those listings first.`}
        </p>
      )}

      {error && (
        <p role="alert" className="text-[12px] leading-relaxed text-[var(--color-error)]">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={`Delete ${name}?`}
        description="This permanently removes the category. It is only allowed when no listings or subcategories reference it."
        confirmLabel="Delete category"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          run(
            () => deleteCategoryAction(formData({ category_id: id })),
            () => router.push("/admin/categories"),
          );
        }}
      />
    </div>
  );
}
