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
function date(value: unknown, timezone?: string): string | null {
  const text = str(value, 100);
  if (!text) return null;
  const offset = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i.exec(text);
  if (offset) {
    const [, y, m, d, h, min, sec = "00"] = offset;
    const calendar = Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
    if (new Date(calendar).toISOString().slice(0, 19) !== `${y}-${m}-${d}T${h}:${min}:${sec}`) return null;
    return Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : null;
  }
  // Interpret local timestamps only with an explicitly supplied source timezone.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match || !timezone) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const wall = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  if (new Date(wall).toISOString().slice(0, 19) !== expected) return null;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const partsAt = (ms: number) => Object.fromEntries(formatter.formatToParts(ms).map(p => [p.type, p.value]));
  const localMs = (ms: number) => { const p = partsAt(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second); };
  const candidates = new Set<number>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const probe = wall + hours * 3600000;
    const candidate = wall - (localMs(probe) - probe);
    if (localMs(candidate) === wall) candidates.add(candidate);
  }
  // Reject DST gaps and repeated local times rather than choosing an offset.
  return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : null;
}
function coordinate(value: unknown, bound: number): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isFinite(numeric) && Math.abs(numeric) <= bound ? numeric : null;
}
function safeExtra(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 30).map(safeExtra);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^[_$]|token|secret|password|api.?key|attendee|guest|email|phone/i.test(key))
    .slice(0, 50).map(([key, val]) => [key, safeExtra(val)]));
  return null;
}
export function normalizeActorItem(value: unknown, importedAt: string) {
  const outer = object(value);
  if (JSON.stringify(outer).length > 60000) throw new Error("Event exceeds import size limit");
  const item = outer.event ? object(outer.event) : outer;
  const extra = item.extra && typeof item.extra === "object" && !Array.isArray(item.extra) ? item.extra as Record<string, unknown> : {};
  if (extra.isOnline === true || item.isOnline === true) throw new Error("Online-only event excluded from physical map");
  const sourceTimezone = str(item.timezone ?? extra.timezone, 100);
  const timezone = sourceTimezone ?? "America/Los_Angeles";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { throw new Error("Invalid timezone"); }
  const title = str(item.title, 500);
  const startAt = date(item.startDateTime ?? item.startAt, sourceTimezone ?? undefined);
  if (!title || !startAt) throw new Error("Missing title or unambiguous offset-bearing start date");
  const url = canonicalEventUrl(item.url ?? item.sourceUrl);
  let endAt = date(item.endDateTime ?? item.endAt, sourceTimezone ?? undefined);
  if (endAt && endAt <= startAt) endAt = null;
  const description = str(item.shortDescription ?? item.description) ?? "";
  const source = str(item.source ?? outer.source, 100) ?? new URL(url).hostname;
  const collectedAt = date(item.collectedAt ?? outer.collectedAt) ?? importedAt;
  const venue = str(item.venue ?? item.venueName, 500);
  const address = str(item.address, 1000);
  const price = item.priceStatus ?? item.priceType;
  const priceStatus = price === "free" || price === "paid" ? price : "unknown";
  const categories = new Set(["music-nightlife", "arts-culture", "markets-shopping", "food-drink", "community-causes", "sports-outdoors", "learning-hobbies", "festivals-other"]);
  const latitude = coordinate(item.latitude ?? extra.latitude, 90);
  const longitude = coordinate(item.longitude ?? extra.longitude, 180);
  const warnings: string[] = [];
  if (Array.isArray(extra.qualityWarnings)) {
    for (const warning of extra.qualityWarnings.slice(0, 10)) {
      if (typeof warning === "string" && /conflicting price/i.test(warning)) warnings.push(warning.slice(0, 500));
    }
  }
  if (latitude === null || longitude === null) warnings.push("Location unresolved; review before approval");
  if (priceStatus === "paid" && /^0(?:\.0+)?(?:\s+[A-Z]{3})?$/.test(str(item.priceText, 500) ?? "")) warnings.push("Price status conflicts with zero price; confirm source");
  const event: LocalEvent = { title, description, startAt, endAt, timezone, venueName: venue, address,
    latitude, longitude, categories: Array.isArray(item.categories) ? item.categories.filter((c): c is EventCategory => typeof c === "string" && categories.has(c)) : [],
    tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === "string").slice(0, 20).map(t => t.slice(0, 100)) : [],
    priceType: priceStatus, sourceType: "apify", sourceUrl: url, sourceEventId: str(item.sourceEventId, 1000) ?? url,
    status: "pending", verified: false };
  return { ...event, mapEndsAt: eventEnd(event)?.timestamp ?? null, source, shortDescription: description,
    startDateTime: startAt, endDateTime: endAt, venue, priceStatus, priceText: str(item.priceText, 500), url, collectedAt,
    extra: { actorExtra: safeExtra(outer.extra ?? item.extra ?? null), provenance: safeExtra(outer.provenance ?? null),
      collectionTimeBasis: date(item.collectedAt ?? outer.collectedAt) ? "actor" : "import-time",
      warnings } };
}
