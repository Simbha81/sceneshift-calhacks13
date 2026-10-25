// Coordinates are fixed, reviewed map pins. Add a venue only after validating its street address and map point.
export const missionVenues = [
  { name: "Gray Area", aliases: ["gray area", "gray area theater", "gray area theater and cultural center"],
    address: "2665 Mission Street, San Francisco, CA 94110", latitude: 37.754392, longitude: -122.418503 },
  { name: "826 Valencia", aliases: ["826 valencia", "826 valencia pirate supply store"],
    address: "826 Valencia Street, San Francisco, CA 94110", latitude: 37.75956, longitude: -122.42156 },
] as const;

export function missionVenueMatch(value: string | null | undefined) {
  const key = value?.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!key) return null;
  return missionVenues.find(venue => venue.aliases.some(alias =>
    key === alias)) ?? null;
}
