import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Pantaker with a one-time code sent to your email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next ?? null, "/");

  return (
    <AuthCard
      eyebrow="Welcome to Pantaker"
      title="Sign in or create your account"
      subtitle=""
    >
      <AuthForm next={next} initialError={params.error} />
    </AuthCard>
  );
}
