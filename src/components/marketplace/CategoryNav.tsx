"use client";

import Link from "next/link";
import { GridIcon } from "@/components/brand/icons";
import type { SampleGroup } from "@/lib/sample-data";
import { withArea } from "@/lib/areas";

export interface NavCategory {
  name: string;
  slug: string;
  description?: string;
}

function hrefFor(slug: string, area?: string): string {
  return withArea(slug ? `/marketplace/${slug}` : "/marketplace", area);
}

function categoryClass(isActive: boolean): string {
  return `flex cursor-pointer flex-col rounded-2xl pr-3 py-2.5 outline-none transition-colors duration-150 ${
    isActive
      ? "bg-[var(--color-canvas-mist)]"
      : "hover:bg-[var(--color-canvas-mist)]"
  }`;
}

export function CategorySidebar({
  categories,
  activeSlug,
  groups = [],
  activeGroup = "",
  onSelectGroup,
  area,
}: {
  categories: NavCategory[];
  activeSlug: string;
  groups?: SampleGroup[];
  activeGroup?: string;
  onSelectGroup?: (slug: string) => void;
  area?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Categories" className="flex flex-col gap-0.5">
        <p className="pr-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-stone-warm)]">
          Categories
        </p>
        <Link href={hrefFor("", area)} className={categoryClass(activeSlug === "")}>
          <span className="flex items-center gap-2">
            <GridIcon className="h-4 w-4 text-[var(--color-muted-gray)]" />
            <span
              className={`text-[13px] ${activeSlug === "" ? "font-semibold text-[var(--color-ink-black)]" : "font-medium text-[var(--color-ink-black)]"}`}
            >
              All items
            </span>
          </span>
        </Link>
        {categories.map((category) => {
          const isActive = category.slug === activeSlug;
          return (
            <Link
              key={category.slug}
              href={hrefFor(category.slug, area)}
              aria-current={isActive ? "page" : undefined}
              className={categoryClass(isActive)}
            >
              <span
                className={`text-[13px] ${isActive ? "font-semibold text-[var(--color-ink-black)]" : "font-medium text-[var(--color-ink-black)]"}`}
              >
                {category.name}
              </span>
              {category.description && (
                <span className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-stone-warm)]">
                  {category.description}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {groups.length > 0 && onSelectGroup && (
        <div className="flex flex-col gap-0.5">
          <p className="pr-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-stone-warm)]">
            Filter by type
          </p>
          <button
            type="button"
            onClick={() => onSelectGroup("")}
            aria-pressed={activeGroup === ""}
            className={`cursor-pointer rounded-2xl px-3 py-2 text-left text-[13px] outline-none transition-colors duration-150 ${
              activeGroup === ""
                ? "bg-[var(--color-canvas-mist)] font-semibold text-[var(--color-ink-black)]"
                : "font-medium text-[var(--color-stone-warm)] hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            }`}
          >
            All types
          </button>
          {groups.map((group) => {
            const isActive = group.slug === activeGroup;
            return (
              <button
                key={group.slug}
                type="button"
                onClick={() => onSelectGroup(group.slug)}
                aria-pressed={isActive}
                className={`cursor-pointer rounded-2xl px-3 py-2 text-left text-[13px] outline-none transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--color-canvas-mist)] font-semibold text-[var(--color-ink-black)]"
                    : "font-medium text-[var(--color-stone-warm)] hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
                }`}
              >
                {group.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CategoryRail({
  categories,
  activeSlug,
  area,
}: {
  categories: NavCategory[];
  activeSlug: string;
  area?: string;
}) {
  return (
    <nav aria-label="Categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Link
        href={hrefFor("", area)}
        aria-current={activeSlug === "" ? "page" : undefined}
        className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
          activeSlug === ""
            ? "border-[var(--color-ink-black)] bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
            : "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)]"
        }`}
      >
        All items
      </Link>
      {categories.map((category) => {
        const isActive = category.slug === activeSlug;
        return (
          <Link
            key={category.slug}
            href={hrefFor(category.slug, area)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              isActive
                ? "border-[var(--color-ink-black)] bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
                : "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)]"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
