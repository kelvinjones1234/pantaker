"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { requestEmailCodeAction } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/types";
import { AlertIcon, MailIcon } from "@/components/auth/icons";

const inputClass =
  "h-[52px] w-full max-w-[352px] sm:w-[352px] rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-200 placeholder:text-[var(--color-muted-gray)] focus:border-[var(--color-muted-gray)]";

const RESEND_SECONDS = 60;

function emptyCode() {
  return Array.from({ length: 6 }, () => "");
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-xs text-[var(--color-error)]"
    >
      {messages[0]}
    </p>
  );
}

function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[var(--color-error-bg)] px-4 py-3 text-xs text-[var(--color-error)]">
      <AlertIcon className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function AuthForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, startVerify] = useTransition();
  const [code, setCode] = useState<string[]>(emptyCode);
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);
  const codeId = useId();

  const [reqState, requestCode, isRequesting] = useActionState(
    requestEmailCodeAction,
    initialAuthState,
  );

  useEffect(() => {
    if (reqState.status === "code_sent") {
      setStep("code");
      setCooldown(RESEND_SECONDS);
      setCode(emptyCode());
      setVerifyError(null);
    }
  }, [reqState]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = () => {
    if (cooldown > 0 || isRequesting) return;
    const data = new FormData();
    data.set("email", email);
    requestCode(data);
    setCooldown(RESEND_SECONDS);
  };

  const focusCodeInput = (index: number) => {
    const input = codeInputs.current[index];
    if (!input) return;
    input.focus();
    input.select();
  };

  const applyDigits = (start: number, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6 - start);
    if (!digits) return;

    setCode((previous) => {
      const next = [...previous];
      digits.split("").forEach((digit, offset) => {
        next[start + offset] = digit;
      });
      return next;
    });
    setVerifyError(null);
    focusCodeInput(Math.min(start + digits.length, 5));
  };

  const handleCodeChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setCode((previous) => {
        const next = [...previous];
        next[index] = "";
        return next;
      });
      return;
    }

    if (digits.length > 1) {
      applyDigits(index, digits);
      return;
    }

    setCode((previous) => {
      const next = [...previous];
      next[index] = digits;
      return next;
    });
    setVerifyError(null);
    if (index < 5) focusCodeInput(index + 1);
  };

  const handleCodeKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      if (!code[index] && index > 0) {
        event.preventDefault();
        setCode((previous) => {
          const next = [...previous];
          next[index - 1] = "";
          return next;
        });
        setVerifyError(null);
        focusCodeInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusCodeInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      focusCodeInput(index + 1);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      setCode((previous) => {
        const next = [...previous];
        next[index] = "";
        return next;
      });
      setVerifyError(null);
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    event.preventDefault();
    applyDigits(0, digits);
  };

  const verifyCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = code.join("");
    if (!/^\d{6}$/.test(token)) {
      setVerifyError("Enter the 6-digit code we emailed you.");
      const firstEmpty = code.findIndex((digit) => !digit);
      focusCodeInput(firstEmpty === -1 ? 0 : firstEmpty);
      return;
    }

    setVerifyError(null);
    startVerify(async () => {
      const result = await signIn("credentials", {
        email,
        token,
        redirect: false,
      });
      if (!result?.ok) {
        setVerifyError(
          "That code is invalid or has expired. Request a new one.",
        );
        return;
      }
      router.push(next);
      router.refresh();
    });
  };

  if (step === "code") {
    return (
      <div className="flex w-full max-w-[352px] flex-col gap-4 sm:w-[352px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="font-brand-serif mt-4 text-xl font-semibold tracking-tight text-[var(--color-ink-black)]">
            Enter your code
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
            We emailed a 6-digit code to{" "}
            <span className="font-medium text-[var(--color-ink-black)]">
              {email}
            </span>
            .
          </p>
        </div>

        {reqState.status === "error" && reqState.message && (
          <FormAlert>{reqState.message}</FormAlert>
        )}
        {verifyError && <FormAlert>{verifyError}</FormAlert>}

        <form onSubmit={verifyCode} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />

          <fieldset aria-describedby={verifyError ? `${codeId}-error` : undefined}>
            <legend className="sr-only">6-digit verification code</legend>
            <div className="grid grid-cols-6 gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    codeInputs.current[index] = node;
                  }}
                  value={digit}
                  onChange={(event) =>
                    handleCodeChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  onPaste={handleCodePaste}
                  onFocus={(event) => event.currentTarget.select()}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  required
                  autoFocus={index === 0}
                  aria-label={`Digit ${index + 1} of 6`}
                  aria-invalid={Boolean(verifyError)}
                  className="h-[52px] w-full rounded-[16px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-center text-lg font-semibold text-[var(--color-ink-black)] tabular outline-none transition-colors duration-200 focus:border-[var(--color-muted-gray)] aria-[invalid=true]:border-[var(--color-error)]"
                />
              ))}
            </div>
            {verifyError && (
              <p
                id={`${codeId}-error`}
                role="alert"
                className="mt-2 text-xs text-[var(--color-error)]"
              >
                {verifyError}
              </p>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={isVerifying}
            className="inline-flex h-[52px] w-full max-w-[352px] sm:w-[352px] cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
          >
            {isVerifying ? "Verifying…" : "Verify & continue"}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setVerifyError(null);
              setCode(emptyCode());
            }}
            className="cursor-pointer font-medium text-[var(--color-muted-gray)] transition-colors duration-150 hover:text-[var(--color-ink-black)]"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || isRequesting}
            className="cursor-pointer font-medium text-[var(--color-shop-violet)] transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-muted-gray)] disabled:no-underline"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isRequesting
                ? "Sending…"
                : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[352px] flex-col gap-4 sm:w-[352px]">
      <form action={requestCode} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {initialError && <FormAlert>{initialError}</FormAlert>}
        {reqState.status === "error" && reqState.message && (
          <FormAlert>{reqState.message}</FormAlert>
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
            aria-invalid={Boolean(reqState.errors?.email)}
            aria-describedby={
              reqState.errors?.email ? "email-error" : undefined
            }
            className={inputClass}
          />
          <FieldError id="email-error" messages={reqState.errors?.email} />
        </div>

        <button
          type="submit"
          disabled={isRequesting}
          className="mt-1 inline-flex h-[52px] w-full max-w-[352px] sm:w-[352px] cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {isRequesting ? "Sending code…" : "Email me a code"}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--color-muted-gray)]">
        No password needed — we&rsquo;ll email you a one-time code.
      </p>
    </div>
  );
}
