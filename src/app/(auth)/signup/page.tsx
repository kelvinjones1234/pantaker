import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** Sign-up and sign-in are the same passwordless flow — funnel to /login. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next ?? null, "/");
  redirect(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
