"use client";

import { ALL_ABUJA, AREA_COOKIE, parseArea } from "@/lib/areas";

export function saveAreaPreference(area: string | null | undefined) {
  if (typeof document === "undefined") return;

  const valid = parseArea(area) ?? ALL_ABUJA;
  if (valid === ALL_ABUJA) {
    document.cookie = `${AREA_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AREA_COOKIE}=${encodeURIComponent(valid)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}
