export type AddressMatch = { label: string; latitude: number; longitude: number };

export function censusAddressMatches(payload: unknown): AddressMatch[] {
  const matches = (payload as { result?: { addressMatches?: unknown } })?.result?.addressMatches;
  if (!Array.isArray(matches)) throw new Error("Address search returned an invalid response. Place the pin on the map instead.");
  return matches.flatMap((match): AddressMatch[] => {
    const { matchedAddress, coordinates } = match ?? {};
    const latitude = coordinates?.y, longitude = coordinates?.x;
    // Bound results to the SF area, and never infer a point from an incomplete response.
    if (typeof matchedAddress !== "string" || !matchedAddress.trim() ||
        typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < 37.70 || latitude > 37.84 ||
        typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -122.53 || longitude > -122.34) return [];
    return [{ label: matchedAddress, latitude, longitude }];
  }).slice(0, 5);
}

export async function findAddress(address: string): Promise<AddressMatch[]> {
  const clean = address.trim();
  if (!clean || clean.length > 100) throw new Error("Enter a street address of up to 100 characters, including San Francisco, CA.");
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", /san francisco/i.test(clean) ? clean : `${clean}, San Francisco, CA`);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Address search is unavailable. Place the pin on the map instead.");
    return censusAddressMatches(await response.json());
  } catch {
    throw new Error("Address search could not complete. Try again or place the pin on the map.");
  } finally { clearTimeout(timeout); }
}
