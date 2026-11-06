const KOBO_PER_NAIRA = 100;

/** Format kobo for display, keeping minor units when they are non-zero. */
export function formatKobo(kobo: number | null | undefined): string {
  if (kobo == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kobo / KOBO_PER_NAIRA);
}
