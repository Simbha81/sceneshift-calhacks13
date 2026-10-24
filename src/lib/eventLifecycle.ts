import type { LocalEvent } from "./event";

export const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;
export const ENDING_SOON_MS = 30 * 60 * 1000;
export const AVAILABILITY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function eventEnd(event: LocalEvent): { timestamp: number; estimated: boolean } | null {
  const start = Date.parse(event.startAt);
  if (!Number.isFinite(start)) return null;
  for (const [value, estimated] of [[event.endAt, false], [event.estimatedEndAt, true]] as const) {
    const timestamp = value ? Date.parse(value) : NaN;
    if (Number.isFinite(timestamp) && timestamp > start) return { timestamp, estimated };
  }
  const timestamp = start + DEFAULT_EVENT_DURATION_MS;
  return Number.isFinite(new Date(timestamp).getTime()) ? { timestamp, estimated: true } : null;
}

export function eventPhase(event: LocalEvent, now: number) {
  const end = eventEnd(event);
  if (!end || !Number.isFinite(now)) return "unknown";
  if (now >= end.timestamp) return "ended";
  if (now < Date.parse(event.startAt)) return "upcoming";
  return end.timestamp - now <= ENDING_SOON_MS ? "ending-soon" : "live";
}

// Availability is independent of approval and time. A source report is not a
// permanent assertion: stale/missing evidence must not dim a pin indefinitely.
export function eventAvailability(event: LocalEvent, now: number): "available" | "sold-out" | "unknown" {
  if (!event.availability || event.availability === "unknown") return "unknown";
  const checked = Date.parse(event.availabilityCheckedAt ?? "");
  if (!Number.isFinite(now) || !Number.isFinite(checked) || checked > now || now - checked > AVAILABILITY_MAX_AGE_MS) return "unknown";
  try {
    const url = new URL(event.availabilitySourceUrl ?? "");
    if (url.protocol !== "https:" && url.protocol !== "http:") return "unknown";
  } catch { return "unknown"; }
  return event.availability;
}

export function eventStateLabel(event: LocalEvent, now: number): string {
  const phase = eventPhase(event, now);
  if (phase === "ending-soon") {
    const end = eventEnd(event)!;
    return `${end.estimated ? "Est. " : ""}${Math.ceil((end.timestamp - now) / 60000)} min left`;
  }
  return { upcoming: "Upcoming", live: "Happening now", ended: "Ended", unknown: "Time unconfirmed" }[phase];
}
