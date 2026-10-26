"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionResult,
} from "@/features/admin/category-actions";
import type { AdminCategoryRecord } from "@/features/admin/category-rules";
import {
  Field,
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
} from "@/components/ui/form-field";
import { slugify } from "@/lib/utils";

export interface ParentOption {
  id: string;
  name: string;
  depth: number;
}

function indentLabel(name: string, depth: number): string {
  return `${"— ".repeat(depth)}${name}`;
}

export function CategoryForm({
  mode,
  category,
  parentOptions,
}: {
  mode: "create" | "edit";
  category?: AdminCategoryRecord;
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const nameId = useId();
  const slugId = useId();
  const descriptionId = useId();
  const parentId = useId();

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parent, setParent] = useState(category?.parent_id ?? "");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onNameChange(value: string) {
    setName(value);
    if (mode === "create" && !slugTouched) setSlug(slugify(value));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result: CategoryActionResult =
        mode === "create"
          ? await createCategoryAction(formData)
          : await updateCategoryAction(formData);

      if (!result.ok) {
        setErrors(result.errors ?? {});
        setFormError(result.error ?? "Check the highlighted fields and try again.");
        return;
      }

      router.push("/admin/categories");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="shop-card flex flex-col gap-5 p-5 sm:p-7" noValidate>
      {mode === "edit" && category && (
        <input type="hidden" name="id" value={category.id} />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={nameId} error={errors.name} required>
          <input
            id={nameId}
            name="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className={fieldInputClass}
            placeholder="e.g. Vehicle parts"
            autoComplete="off"
            aria-invalid={Boolean(errors.name?.length)}
          />
        </Field>

        <Field
          label="Slug"
          htmlFor={slugId}
          error={errors.slug}
          hint=""
          required
        >
          <input
            id={slugId}
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className={fieldInputClass}
            placeholder="vehicle-parts"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.slug?.length)}
          />
        </Field>
      </div>

      <Field
        label="Parent category"
        htmlFor={parentId}
        error={errors.parent_id}
        hint="Leave empty for a top-level category. A category cannot sit inside its own descendant."
      >
        <select
          id={parentId}
          name="parent_id"
          value={parent}
          onChange={(event) => setParent(event.target.value)}
          className={fieldSelectClass}
          aria-invalid={Boolean(errors.parent_id?.length)}
        >
          <option value="">No parent (top level)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {indentLabel(option.name, option.depth)}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Description"
        htmlFor={descriptionId}
        error={errors.description}
        hint="Optional. Shown to buyers under the category name."
      >
        <textarea
          id={descriptionId}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={fieldTextareaClass}
          rows={3}
          placeholder="What belongs in this category?"
          aria-invalid={Boolean(errors.description?.length)}
        />
      </Field>

      {formError && (
        <p role="alert" className="text-[13px] text-[var(--color-error)]">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/admin/categories"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
