import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNGN(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function pricingLabel(
  pricingType: string,
  price: number | null | undefined,
): string {
  if (pricingType === "free") return "Free";
  if (pricingType === "offer") return price ? `${formatNGN(price)} · or offer` : "Make an offer";
  if (price == null) return "Contact seller";
  return formatNGN(price);
}

export function formatQuantity(
  quantity: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (quantity == null) return null;

  const amount = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 3,
  }).format(quantity);
  const normalized = unit?.trim().toLowerCase();

  if (!normalized || normalized === "item") {
    return `${amount} ${quantity === 1 ? "item" : "items"}`;
  }
  if (normalized === "tonnes") return `${amount} t`;
  if (normalized === "grams") return `${amount} g`;
  return `${amount} ${normalized}`;
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
