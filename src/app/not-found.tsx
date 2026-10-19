import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-canvas-mist)] px-4 py-16 text-center text-[var(--color-ink-black)]">
      <div className="flex w-full max-w-md flex-col items-center rounded-[28px] bg-[var(--color-pure-white)] p-8 sm:p-10">
        <div className="relative mb-3 h-48 w-48">
          <Image
            src="/illustrations/Recycling-rafiki.svg"
            alt=""
            fill
            className="object-contain"
            priority
            aria-hidden="true"
          />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-shop-violet)]">
          404 Error
        </span>
        <h1 className="font-brand-serif mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
          This page found a new home
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-gray)]">
          The page or listing you are looking for has been moved, traded, or recycled into something new.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-[var(--color-shop-violet)] px-6 py-2.5 text-xs font-semibold text-[var(--color-pure-white)] transition hover:opacity-95"
        >
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
