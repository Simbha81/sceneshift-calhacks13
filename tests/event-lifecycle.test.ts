import { test } from "node:test";
import assert from "node:assert/strict";
import type { LocalEvent } from "../src/lib/event";
import { AVAILABILITY_MAX_AGE_MS, DEFAULT_EVENT_DURATION_MS, ENDING_SOON_MS,
  eventAvailability, eventEnd, eventPhase, eventStateLabel } from "../src/lib/eventLifecycle";
import { isMapVisible } from "../src/lib/eventValidation";

// Synthetic unit-test data only; never imported into Convex or displayed.
const start = Date.parse("2030-01-01T20:00:00.000Z");
const end = start + 6 * 3600000;
const event: LocalEvent = { title: "Unit test", description: "", startAt: new Date(start).toISOString(),
  endAt: new Date(end).toISOString(), timezone: "America/Los_Angeles", latitude: 37.78, longitude: -122.42,
  categories: [], tags: [], priceType: "unknown", sourceType: "manual", status: "approved", verified: false };

test("an ongoing event remains visible until its actual end, including across UTC midnight", () => {
  assert.equal(isMapVisible(event, start), true);
  assert.equal(isMapVisible(event, start + 4 * 3600000), true);
  assert.equal(isMapVisible(event, end - 1), true);
  assert.equal(isMapVisible(event, end), false);
  assert.equal(isMapVisible(event, end + 1), false);
});
test("confirmed end takes precedence over explicit estimates and the default duration", () => {
  assert.deepEqual(eventEnd({ ...event, estimatedEndAt: new Date(start + 3600000).toISOString() }),
    { timestamp: end, estimated: false });
});
test("a supplied estimated end is used without being represented as confirmed", () => {
  const estimatedEndAt = new Date(start + 5 * 3600000).toISOString();
  assert.deepEqual(eventEnd({ ...event, endAt: null, estimatedEndAt }),
    { timestamp: Date.parse(estimatedEndAt), estimated: true });
});
test("missing or invalid ends get a labeled three-hour estimate and expire at that boundary", () => {
  for (const endAt of [undefined, null, "invalid", new Date(start - 1).toISOString(), event.startAt]) {
    const estimated = { ...event, endAt };
    assert.deepEqual(eventEnd(estimated), { timestamp: start + DEFAULT_EVENT_DURATION_MS, estimated: true });
    assert.equal(isMapVisible(estimated, start + DEFAULT_EVENT_DURATION_MS - 1), true);
    assert.equal(isMapVisible(estimated, start + DEFAULT_EVENT_DURATION_MS), false);
  }
});
test("ending-soon starts in the final 30 minutes, only after the event starts", () => {
  assert.equal(eventPhase(event, start - 1), "upcoming");
  assert.equal(eventPhase(event, end - ENDING_SOON_MS - 1), "live");
  assert.equal(eventPhase(event, end - ENDING_SOON_MS), "ending-soon");
  assert.equal(eventStateLabel(event, end - 60000), "1 min left");
  const estimated = { ...event, endAt: null };
  assert.equal(eventStateLabel(estimated, start + DEFAULT_EVENT_DURATION_MS - 60000), "Est. 1 min left");
  assert.equal(eventPhase({ ...event, endAt: new Date(start + 60000).toISOString() }, start - 1), "upcoming");
});
test("stored index data cannot override the real end in visibility validation", () => {
  assert.equal(isMapVisible({ ...event, mapEndsAt: end + 99999999 }, end), false);
  assert.equal(isMapVisible(event, NaN), false);
  assert.equal(eventEnd({ ...event, startAt: "unknown" }), null);
});
const soldOut = { ...event, availability: "sold-out" as const,
  availabilitySourceUrl: "https://example.org/tickets", availabilityCheckedAt: new Date(start).toISOString() };
test("recent sourced sold-out status does not remove a live event", () => {
  assert.equal(eventAvailability(soldOut, start + 1000), "sold-out");
  assert.equal(isMapVisible(soldOut, start + 1000), true);
  assert.equal(isMapVisible(soldOut, end), false);
});
test("missing, stale, future, and unsafe availability evidence remains unknown", () => {
  assert.equal(eventAvailability(event, start), "unknown");
  assert.equal(eventAvailability({ ...soldOut, availabilitySourceUrl: null }, start), "unknown");
  assert.equal(eventAvailability({ ...soldOut, availabilitySourceUrl: "javascript:alert(1)" }, start), "unknown");
  assert.equal(eventAvailability({ ...soldOut, availabilityCheckedAt: "invalid" }, start), "unknown");
  assert.equal(eventAvailability(soldOut, start - 1), "unknown");
  assert.equal(eventAvailability(soldOut, start + AVAILABILITY_MAX_AGE_MS + 1), "unknown");
});
test("availability can recover after the source reports tickets available again", () => {
  assert.equal(eventAvailability({ ...soldOut, availability: "available" }, start + 1000), "available");
});
