"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  authButtonClass,
  authInputClass,
  FormAlert,
} from "@/components/auth/form-ui";

function initialMessage(error?: string): string | null {
  if (!error) return null;
  if (error === "CredentialsSignin") return "Incorrect email or password.";
  return "We couldn't sign you in. Please try again.";
}

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signupHref =
    next !== "/" ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result?.ok) {
        setError("Incorrect email or password.");
        return;
      }
      router.push(next);
      router.refresh();
    });
  };

  return (
    <div className="flex w-full max-w-[352px] flex-col gap-4 sm:w-[352px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {(initialMessage(initialError) || error) && (
          <FormAlert>{error ?? initialMessage(initialError)}</FormAlert>
        )}

        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className={authInputClass}
          />
        </div>

        <div className="relative w-full max-w-[352px] sm:w-[352px]">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className={`${authInputClass} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-4 cursor-pointer text-xs font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:text-[var(--color-ink-black)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button type="submit" disabled={isPending} className={`mt-1 ${authButtonClass}`}>
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--color-muted-gray)]">
        New to Pantaker?{" "}
        <Link
          href={signupHref}
          className="cursor-pointer font-medium text-[var(--color-shop-violet)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
