export interface CityOption {
  name: string;
  /** Only supported cities can be selected; the rest are shown but disabled. */
  supported: boolean;
}

/** The city Pantaker is live in today. */
export const LAUNCH_CITY = "Abuja";

/**
 * Nigerian cities shown in the seller profile picker. Pantaker launches in
 * Abuja, so Abuja is the only selectable city for now. The other cities are
 * listed (and disabled) so sellers can see what is coming without being able to
 * pick a city the marketplace doesn't support yet.
 */
export const NIGERIAN_CITIES: CityOption[] = [
  { name: LAUNCH_CITY, supported: true },
  { name: "Abeokuta", supported: false },
  { name: "Akure", supported: false },
  { name: "Benin City", supported: false },
  { name: "Calabar", supported: false },
  { name: "Enugu", supported: false },
  { name: "Ibadan", supported: false },
  { name: "Ilorin", supported: false },
  { name: "Jos", supported: false },
  { name: "Kaduna", supported: false },
  { name: "Kano", supported: false },
  { name: "Lagos", supported: false },
  { name: "Maiduguri", supported: false },
  { name: "Onitsha", supported: false },
  { name: "Owerri", supported: false },
  { name: "Port Harcourt", supported: false },
  { name: "Sokoto", supported: false },
  { name: "Uyo", supported: false },
  { name: "Warri", supported: false },
  { name: "Zaria", supported: false },
];
