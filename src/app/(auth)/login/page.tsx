import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Pantaker with your email and password.",
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
      eyebrow="Welcome back"
      title="Sign in to Pantaker"
      subtitle="Enter the email and password you signed up with."
    >
      <LoginForm next={next} initialError={params.error} />
    </AuthCard>
  );
}
