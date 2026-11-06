import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Pantaker account with your email and password.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next ?? null, "/");

  return (
    <AuthCard
      eyebrow="Join Pantaker"
      title="Create your account"
      subtitle="Use your email and a password. We'll send a 6-digit code to confirm your address."
    >
      <SignupForm next={next} initialError={params.error} />
    </AuthCard>
  );
}
