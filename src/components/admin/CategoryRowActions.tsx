"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  reorderCategoryAction,
  setCategoryActiveAction,
  type CategoryActionResult,
} from "@/features/admin/category-actions";

const buttonClass =
  "inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-3 text-[12px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-40";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function CategoryRowActions({
  id,
  name,
  isActive,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  name: string;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<CategoryActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Could not complete that change. Try again.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Link href={`/admin/categories/${id}`} className={buttonClass}>
          Edit
        </Link>
        <button
          type="button"
          className={buttonClass}
          disabled={pending || !canMoveUp}
          aria-label={`Move ${name} up`}
          onClick={() =>
            run(() =>
              reorderCategoryAction(
                formData({ category_id: id, direction: "up" }),
              ),
            )
          }
        >
          Move up
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={pending || !canMoveDown}
          aria-label={`Move ${name} down`}
          onClick={() =>
            run(() =>
              reorderCategoryAction(
                formData({ category_id: id, direction: "down" }),
              ),
            )
          }
        >
          Move down
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={pending}
          onClick={() =>
            run(() =>
              setCategoryActiveAction(
                formData({ category_id: id, is_active: String(!isActive) }),
              ),
            )
          }
        >
          {isActive ? "Disable" : "Enable"}
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-[280px] text-right text-[11px] leading-relaxed text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
