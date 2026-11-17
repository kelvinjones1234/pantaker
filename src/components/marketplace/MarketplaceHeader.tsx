"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ChatIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "@/components/brand/icons";
import { Logo } from "@/components/brand/Logo";

export function MarketplaceHeader({
  initialQuery = "",
  user = null,
}: {
  initialQuery?: string;
  user?: { email?: string | null; isAdmin?: boolean } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isListingDetail = pathname.startsWith("/marketplace/listing/");
  const [value, setValue] = useState(initialQuery);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-faint-border)] bg-[var(--overlay-paper-95)] backdrop-blur-md">
      <div
        className={`mx-auto flex w-full flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:gap-5 sm:px-6 sm:py-0 ${
          isListingDetail ? "max-w-6xl lg:pl-24" : "max-w-[1072px]"
        }`}
      >
        <Link href="/" aria-label="Pantaker home" className="shrink-0">
          <Logo compact className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>

        {!isListingDetail && (
          <form
            role="search"
            onSubmit={submit}
            className="order-last flex h-14 w-full min-w-0 flex-none items-center gap-2 rounded-full border border-[var(--color-ink-10)] bg-[var(--color-pure-white)] pl-4 pr-1 transition-colors focus-within:border-[var(--color-muted-gray)] sm:order-none sm:w-auto sm:flex-1"
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
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[var(--color-ink-black)] tracking-[-0.031em] outline-none placeholder:text-[var(--color-muted-gray)] sm:text-sm"
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
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
        )}

        <nav
          className="hidden items-center gap-1 lg:ml-auto lg:flex"
          aria-label="Primary"
        >
          {!isListingDetail && (
            <>
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
            </>
          )}
          {user && isListingDetail && (
            <Link
              href="/messages"
              aria-label="Messages"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            >
              <ChatIcon className="h-5 w-5" />
            </Link>
          )}
          {user && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            >
              <ReceiptIcon className="h-4 w-4" />
              Orders
            </Link>
          )}
          {user && (
            <Link
              href="/seller"
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            >
              Dashboard
            </Link>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin"
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
            >
              Admin
            </Link>
          )}
        </nav>

        {!isListingDetail && (
          <Link
            href={user ? "/seller" : "/login?next=/seller"}
            aria-label={user ? "Open seller dashboard" : "Sign in to Pantaker"}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-xs font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 lg:flex"
          >
            {user?.email?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
          </Link>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          {user && (
            <div className="flex items-center gap-0.5 lg:hidden">
              {isListingDetail && (
                <Link
                  href="/messages"
                  aria-label="Messages"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
                >
                  <ChatIcon className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/orders"
                aria-label="Your orders"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]"
              >
                <ReceiptIcon className="h-5 w-5" />
              </Link>
            </div>
          )}

          <Link
            href={user ? "/sell" : "/login?next=/sell"}
            aria-label="List an item"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-ink-black)] text-xs font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 hover:opacity-90 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <PlusIcon className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">List item</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
