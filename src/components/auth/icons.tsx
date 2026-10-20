import type { ReactElement } from "react";

interface IconProps {
  className?: string;
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
