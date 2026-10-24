import type { LocalEvent, EventCategory } from "./event";
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  "music-nightlife": "Music and nightlife", "arts-culture": "Arts and culture",
  "markets-shopping": "Markets and shopping", "food-drink": "Food and drink",
  "community-causes": "Community and causes", "sports-outdoors": "Sports and outdoors",
  "learning-hobbies": "Learning and hobbies", "festivals-other": "Festivals and other",
};
export function hasCoordinates(event: LocalEvent): event is LocalEvent & { latitude: number; longitude: number } {
  return typeof event.latitude === "number" && Number.isFinite(event.latitude) && Math.abs(event.latitude) <= 90
    && typeof event.longitude === "number" && Number.isFinite(event.longitude) && Math.abs(event.longitude) <= 180;
}
export function eventKey(event: LocalEvent): string {
  return (event as LocalEvent & { _id?: string })._id ?? JSON.stringify([event.sourceType, event.sourceUrl, event.sourceEventId, event.title, event.startAt, event.latitude, event.longitude]);
}
export function listingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function eventTime(event: LocalEvent): string {
  if (!Number.isFinite(Date.parse(event.startAt))) return "Time unconfirmed";
  try { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: event.timezone }).format(new Date(event.startAt)) + ` (${event.timezone})`; }
  catch { return new Date(event.startAt).toISOString() + " (timezone unconfirmed)"; }
}
