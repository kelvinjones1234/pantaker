import type { ReactElement } from "react";

interface IconProps {
  className?: string;
}

/** Official Google "G" mark for the OAuth button. */
export function GoogleIcon({ className }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.19a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a6.9 6.9 0 0 1 0-4.34V7.35H1.7a11.5 11.5 0 0 0 0 9.3l3.85-2.98z"
      />
      <path
        fill="#EA4335"
        d="M12 4.58c1.69 0 3.2.58 4.4 1.72l3.3-3.3A11.5 11.5 0 0 0 1.7 7.35l3.85 2.98C6.46 7.61 9 4.58 12 4.58z"
      />
    </svg>
  );
}

function Stroke({ className, children }: IconProps & { children: React.ReactNode }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function MailIcon({ className }: IconProps): ReactElement {
  return (
    <Stroke className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="m4.5 8 6.4 4.4a2 2 0 0 0 2.2 0L19.5 8" />
    </Stroke>
  );
}

export function AlertIcon({ className }: IconProps): ReactElement {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 15.8v.2" />
    </Stroke>
  );
}
