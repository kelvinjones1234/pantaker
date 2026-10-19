import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-canvas-mist)] px-4 py-10">
      <Link href="/" className="mb-6" aria-label="Pantaker home">
        <Logo />
      </Link>
      <div className="w-full max-w-[416px]">{children}</div>
      <p className="mt-6 max-w-xs text-center text-xs leading-relaxed text-[var(--color-ash-veil)]">
        {brand.tagline}
      </p>
    </div>
  );
}
