export interface AbujaArea {
  name: string;
  hub: string;
}

/** Abuja districts used by the district picker and the listings filters. */
export const ABUJA_AREAS: AbujaArea[] = [
  { name: "All Abuja", hub: "Capital-wide listings" },
  { name: "Apo", hub: "Mechanic Village & auto scrap" },
  { name: "Dei-Dei", hub: "Building surplus & salvage" },
  { name: "Wuse 2", hub: "Electronics & tech refurbishers" },
  { name: "Idu Industrial", hub: "Factory scrap & heavy offcuts" },
  { name: "Garki", hub: "Commercial spares & appliances" },
  { name: "Maitama", hub: "Pre-loved & executive surplus" },
  { name: "Mpape", hub: "Quarry & hillside salvage" },
  { name: "Kubwa", hub: "Workshop tools & home salvage" },
  { name: "Central Area", hub: "Offices & institutional surplus" },
  { name: "Lugbe", hub: "Airport Road yards & materials" },
];

export const ALL_ABUJA = "All Abuja";

const AREA_NAMES = new Set(ABUJA_AREAS.map((area) => area.name));

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Returns a canonical served area, or null for missing/unknown values. */
export function parseArea(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const name = safeDecode(value).trim();
  return AREA_NAMES.has(name) ? name : null;
}

/** A valid query value wins, then the saved preference, then all Abuja. */
export function resolveArea(
  requested: string | null | undefined,
  saved: string | null | undefined,
): string {
  return parseArea(requested) ?? parseArea(saved) ?? ALL_ABUJA;
}

/** Serialize a non-default area as a query parameter. */
export function areaQuery(area: string | null | undefined): string {
  const valid = parseArea(area);
  return valid && valid !== ALL_ABUJA
    ? `area=${encodeURIComponent(valid)}`
    : "";
}

/** Add the current area to a path without disturbing an existing query/hash. */
export function withArea(path: string, area: string | null | undefined): string {
  const query = areaQuery(area);
  if (!query) return path;
  const [withoutHash, hash] = path.split("#", 2);
  const separator = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${separator}${query}${hash ? `#${hash}` : ""}`;
}

export const AREA_COOKIE = "pantaker_area";
