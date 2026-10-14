import type { ReactElement, ReactNode } from "react";

/**
 * PANTAKER premium icon set — one file, one visual language.
 *
 * Duotone construction: ink-black (#000) structure strokes + a single Shop
 * violet (#5433eb) accent detail per glyph, 24px grid, round caps/joins.
 * Simple, clean, no green. Replaces the generic Lucide set on the landing.
 */

export interface BrandIconProps {
  className?: string;
}

type P = BrandIconProps;

const VIOLET = "#5433eb";

function Svg({ className, children }: P & { children: ReactNode }) {
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

function AccentDot({ cx, cy, r = 1.5 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={VIOLET} stroke="none" />;
}

export function HomeIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6.5 10v9.5h11V10" />
      <rect x="10.8" y="14" width="2.4" height="5.5" rx="1.2" fill={VIOLET} stroke="none" />
    </Svg>
  );
}

export function GridIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <rect x="4" y="4" width="7" height="7" rx="2" fill={VIOLET} stroke="none" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </Svg>
  );
}

export function TagIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M4 4h7l9 9-7 7-9-9V4z" />
      <AccentDot cx={8.2} cy={8.2} r={1.6} />
    </Svg>
  );
}

export function WrenchIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M15 4a4.5 4.5 0 0 0-4.2 6L4 16.8 7.2 20 14 13.2A4.5 4.5 0 0 0 20 9l-2.6 2.6-2.8-.6-.6-2.8L16.6 5.6" />
      <AccentDot cx={14} cy={10} r={1.3} />
    </Svg>
  );
}

export function HeartIcon({ className, filled }: P & { filled?: boolean }): ReactElement {
  return (
    <Svg className={className}>
      <path
        d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6A4.6 4.6 0 0 1 8.1 5c1.6 0 3 .9 3.9 2.2A4.6 4.6 0 0 1 15.9 5a4.6 4.6 0 0 1 4.6 4.6c0 3.7-3.5 6.9-8.5 10.9z"
        fill={filled ? VIOLET : "none"}
        stroke={filled ? VIOLET : "currentColor"}
      />
    </Svg>
  );
}

export function SearchIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8l4.7 4.7" stroke={VIOLET} strokeWidth={2.4} />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M4 12h14.5" />
      <path d="M13.5 6.5 19 12l-5.5 5.5" stroke={VIOLET} strokeWidth={2.2} />
    </Svg>
  );
}

export function ChevronDownIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="m6 9.5 6 6 6-6" />
      <path d="m6 14 6 6 6-6" stroke={VIOLET} strokeWidth={2} opacity={0.55} />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M9.5 6l6 6-6 6" />
      <path d="M14 6l6 6-6 6" stroke={VIOLET} strokeWidth={2} opacity={0.55} />
    </Svg>
  );
}

export function MapPinIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M12 21.5C7.5 16.5 4.5 12.9 4.5 9.5a7.5 7.5 0 0 1 15 0c0 3.4-3 7-7.5 12z" />
      <AccentDot cx={12} cy={9.5} r={2.4} />
    </Svg>
  );
}

export function XIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
      <AccentDot cx={12} cy={12} r={1.6} />
    </Svg>
  );
}

export function CheckIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={VIOLET} strokeWidth={2.2} />
    </Svg>
  );
}

export function PlusIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
      <AccentDot cx={12} cy={12} r={1.6} />
    </Svg>
  );
}

export function PackageIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M4 8v8l8 4.5 8-4.5V8" />
      <path d="M4 8l8 4.5L20 8" stroke={VIOLET} strokeWidth={2} />
      <path d="M12 12.5V20" />
    </Svg>
  );
}

export function CpuIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M9 4v2.5M15 4v2.5M9 17.5V20M15 17.5V20M4 9h2.5M4 15h2.5M17.5 9H20M17.5 15H20" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <rect x="10.6" y="10.6" width="2.8" height="2.8" rx="0.8" fill={VIOLET} stroke="none" />
    </Svg>
  );
}

export function HammerIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M11 3.5 14.5 3l6 6-.5 3.5-6-6-2.5-3z" fill={VIOLET} stroke="none" />
      <path d="M10.2 10.4 4.5 16.1 7.9 19.5l5.7-5.7" />
      <path d="M4.5 16.1 3 19.5l1.5 1.5 3.4-1.5" />
    </Svg>
  );
}

export function CarIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M4 15.5v-3.5l1.9-4.4A2 2 0 0 1 7.7 6.2h8.6a2 2 0 0 1 1.8 1.4L20 12v3.5" />
      <path d="M4 12h16" />
      <path d="M6.5 15.5V17M17.5 15.5V17" />
      <AccentDot cx={8} cy={18.6} r={1.7} />
      <AccentDot cx={16} cy={18.6} r={1.7} />
    </Svg>
  );
}

export function SofaIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M6.5 11V8a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v3" />
      <path d="M4.5 11a2 2 0 0 1 4 0v1h7v-1a2 2 0 0 1 4 0v3.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V11z" />
      <path d="M12 12v3.5" stroke={VIOLET} strokeWidth={2} />
      <path d="M7 19.5v-2M17 19.5v-2" />
    </Svg>
  );
}

export function ShirtIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M9 4 4 7l2 4 2-1v10h8V10l2 1 2-4-5-3a3 3 0 0 1-6 0z" />
      <path d="M9 4.5a3 3 0 0 0 6 0" stroke={VIOLET} strokeWidth={2} />
    </Svg>
  );
}

export function PlugIcon({ className }: P): ReactElement {
  return (
    <Svg className={className}>
      <path d="M9 3.5V8M15 3.5V8" stroke={VIOLET} strokeWidth={2.2} />
      <path d="M7 8h10v3.5a5 5 0 0 1-10 0V8z" />
      <path d="M12 16.5V21" />
    </Svg>
  );
}

/** Component type for icon maps (e.g. department chips). */
export type BrandIconComponent = (props: BrandIconProps) => ReactElement;
