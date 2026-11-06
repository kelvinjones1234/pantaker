import { cache } from "react";
import { cookies } from "next/headers";
import { ALL_ABUJA, AREA_COOKIE, parseArea } from "@/lib/areas";

export const getSavedArea = cache(async (): Promise<string> => {
  const value = (await cookies()).get(AREA_COOKIE)?.value;
  return parseArea(value) ?? ALL_ABUJA;
});
