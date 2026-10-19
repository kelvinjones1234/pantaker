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
  { name: "Kubwa", hub: "Workshop tools & home salvage" },
  { name: "Central Area", hub: "Offices & institutional surplus" },
  { name: "Lugbe", hub: "Airport Road yards & materials" },
];

export const ALL_ABUJA = "All Abuja";
