import type { LocalEvent, EventCategory } from "../src/lib/event";
import { eventEnd } from "../src/lib/eventLifecycle";

type Input = { maxEventbriteEvents?: number; maxPartifulEvents?: number; maxLumaEvents?: number;
  maxDoTheBayEvents?: number; daysAhead?: number; eventbriteCity?: string; lumaCity?: string };
export function validateActorInput(input: Input) {
  const counts = { maxEventbriteEvents: 5, maxPartifulEvents: 5, maxLumaEvents: 5, maxDoTheBayEvents: 5 };
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
    const value = input[key] ?? counts[key];
    const minimum = key === "maxDoTheBayEvents" ? 0 : 1;
    if (!Number.isInteger(value) || value < minimum || value > 1000) throw new Error(`${key} must be an integer from ${minimum} to 1000 (Actor build 0.0.13)`);
    counts[key] = value;
  }
  const daysAhead = input.daysAhead ?? 14;
  if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 90) throw new Error("daysAhead must be an integer from 1 to 90");
  const eventbriteCity = input.eventbriteCity ?? "san-francisco";
  const lumaCity = input.lumaCity ?? "sf";
  for (const city of [eventbriteCity, lumaCity]) if (!/^[a-z0-9-]{1,80}$/.test(city)) throw new Error("City must be a lowercase slug");
  return { ...counts, daysAhead, eventbriteCity, lumaCity };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an event object");
  return value as Record<string, unknown>;
}
function str(value: unknown, max = 5000): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}
export function canonicalEventUrl(value: unknown): string {
  const raw = str(value, 4000);
  if (!raw) throw new Error("Missing event URL");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid event URL"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe event URL");
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    if (/token|secret|password|api.?key/i.test(key)) throw new Error("Credential-bearing event URL rejected");
  }
  url.hash = ""; url.searchParams.sort();
  return url.href;
}
function date(value: unknown): string | null {
  const text = str(value, 100);
  // Do not let Date.parse silently interpret a local time using server UTC.
  if (!text || !/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) || !Number.isFinite(Date.parse(text))) return null;
  return new Date(text).toISOString();
}
function safeExtra(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 30).map(safeExtra);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^[_$]|token|secret|password|api.?key|attendees|guests|email|phone/i.test(key))
    .slice(0, 50).map(([key, val]) => [key, safeExtra(val)]));
  return null;
}
export function normalizeActorItem(value: unknown, importedAt: string) {
  const outer = object(value);
  if (JSON.stringify(outer).length > 60000) throw new Error("Event exceeds import size limit");
  const item = outer.event ? object(outer.event) : outer;
  const title = str(item.title, 500);
  const startAt = date(item.startDateTime ?? item.startAt);
  if (!title || !startAt) throw new Error("Missing title or unambiguous offset-bearing start date");
  const url = canonicalEventUrl(item.url ?? item.sourceUrl);
  let endAt = date(item.endDateTime ?? item.endAt);
  if (endAt && endAt <= startAt) endAt = null;
  const description = str(item.shortDescription ?? item.description) ?? "";
  const source = str(item.source ?? outer.source, 100) ?? new URL(url).hostname;
  const collectedAt = date(item.collectedAt ?? outer.collectedAt) ?? importedAt;
  const venue = str(item.venue ?? item.venueName, 500);
  const address = str(item.address, 1000);
  const price = item.priceStatus ?? item.priceType;
  const priceStatus = price === "free" || price === "paid" ? price : "unknown";
  const categories = new Set(["music-nightlife", "arts-culture", "markets-shopping", "food-drink", "community-causes", "sports-outdoors", "learning-hobbies", "festivals-other"]);
  const timezone = str(item.timezone, 100) ?? "America/Los_Angeles";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { throw new Error("Invalid timezone"); }
  const latitude = typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 ? item.latitude : null;
  const longitude = typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180 ? item.longitude : null;
  const event: LocalEvent = { title, description, startAt, endAt, timezone, venueName: venue, address,
    latitude, longitude, categories: Array.isArray(item.categories) ? item.categories.filter((c): c is EventCategory => typeof c === "string" && categories.has(c)) : [],
    tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === "string").slice(0, 20).map(t => t.slice(0, 100)) : [],
    priceType: priceStatus, sourceType: "apify", sourceUrl: url, sourceEventId: str(item.sourceEventId, 1000) ?? url,
    status: "pending", verified: false };
  return { ...event, mapEndsAt: eventEnd(event)?.timestamp ?? null, source, shortDescription: description,
    startDateTime: startAt, endDateTime: endAt, venue, priceStatus, priceText: str(item.priceText, 500), url, collectedAt,
    extra: { actorExtra: safeExtra(outer.extra ?? item.extra ?? null), provenance: safeExtra(outer.provenance ?? null),
      collectionTimeBasis: date(item.collectedAt ?? outer.collectedAt) ? "actor" : "import-time",
      warnings: latitude === null || longitude === null ? ["Location unresolved; review before approval"] : [] } };
}
