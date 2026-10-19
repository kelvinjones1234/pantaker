"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, SearchIcon, XIcon } from "@/components/brand/icons";
import { Logo } from "@/components/brand/Logo";

export function MarketplaceHeader({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-faint-border)] bg-[var(--overlay-paper-95)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link href="/" aria-label="Pantaker home" className="shrink-0">
          <Logo compact className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>

        <form
          role="search"
          onSubmit={submit}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--color-ink-10)] bg-[var(--color-pure-white)] pl-4 pr-1 transition-colors focus-within:border-[var(--color-muted-gray)] sm:h-12"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--color-muted-gray)]" />
          <label htmlFor="market-search" className="sr-only">
            Search listings
          </label>
          <input
            id="market-search"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search listings in Abuja"
            autoComplete="off"
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--color-ink-black)] tracking-[-0.031em] outline-none placeholder:text-[var(--color-muted-gray)]"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear search"
              className="cursor-pointer rounded-full p-1.5 text-[var(--color-muted-gray)] transition-colors hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 sm:h-10 sm:w-10"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </form>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <Link
            href="/marketplace"
            className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
          >
            Browse
          </Link>
          <Link
            href="/#how"
            className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
          >
            How it works
          </Link>
        </nav>

        <Link
          href="/sell"
          className="shrink-0 cursor-pointer rounded-full bg-[var(--color-ink-black)] px-4 py-2.5 text-xs font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 sm:text-sm"
        >
          List item
        </Link>
      </div>
    </header>
  );
}
