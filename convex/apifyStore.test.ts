/// <reference types="vite/client" />
import { test, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal, api } from "./_generated/api";
import { normalizeActorItem, validateActorInput } from "../shared/apifyNormalization";
const modules = import.meta.glob("./**/*.ts");
const row = { source: "eventbrite", title: "Synthetic test only", shortDescription: "Never seeded",
  startDateTime: "2030-01-01T20:00:00-08:00", endDateTime: "2030-01-01T23:00:00-08:00",
  url: "https://example.org/events/one?utm_source=test", venue: "Example", address: "Example address",
  priceStatus: "free", priceText: "Free with RSVP", collectedAt: "2026-10-24T20:00:00Z", extra: { token: "redact", attendees: ["redact"], conditions: "RSVP required" } };
test("URL upsert is idempotent across tracking links and preserves review decisions", async () => {
  const t = convexTest(schema, modules);
  expect((await t.mutation(internal.apifyStore.upsertPage, { items: [row] })).inserted).toBe(1);
  await t.run(async ctx => { const doc = await ctx.db.query("events").first(); await ctx.db.patch("events", doc!._id, { status: "approved" }); });
  expect((await t.mutation(internal.apifyStore.upsertPage, { items: [{ ...row, url: "https://example.org/events/one" }] })).updated).toBe(1);
  expect(await t.run(async ctx => (await ctx.db.query("events").take(2)).length)).toBe(1);
  expect((await t.query(api.apifyRead.list, { source: "eventbrite" })).length).toBe(1);
  const changed = { ...row, startDateTime: "2030-01-02T20:00:00-08:00", endDateTime: "2030-01-02T23:00:00-08:00" };
  await t.mutation(internal.apifyStore.upsertPage, { items: [changed] });
  expect(await t.query(api.apifyRead.list, {})).toEqual([]);
  await t.run(async ctx => { const doc = await ctx.db.query("events").first(); await ctx.db.patch("events", doc!._id, { status: "rejected" }); });
  await t.mutation(internal.apifyStore.upsertPage, { items: [row] });
  expect(await t.run(async ctx => (await ctx.db.query("events").first())?.status)).toBe("rejected");
});
test("bad records are reported while valid records import; no source can self-approve", async () => {
  const t = convexTest(schema, modules);
  const result = await t.mutation(internal.apifyStore.upsertPage, { items: [{ title: "Bad" }, { ...row, status: "approved", verified: true }] });
  expect(result.rejected).toBe(1); expect(result.inserted).toBe(1);
  expect(await t.query(api.apifyRead.list, {})).toEqual([]);
  const doc = await t.run(async ctx => await ctx.db.query("events").first());
  expect(doc?.verified).toBe(false); expect(doc?.mapEndsAt).toBe(Date.parse(row.endDateTime));
});
test("normalization handles UTC offsets and strips sensitive extra fields without inventing coordinates", () => {
  const doc = normalizeActorItem(row, "2026-10-25T00:00:00.000Z");
  expect(doc.startAt).toBe("2030-01-02T04:00:00.000Z");
  expect(doc.latitude).toBe(null); expect(doc.priceType).toBe("free");
  expect(doc.extra.actorExtra).toEqual({ conditions: "RSVP required" });
  expect(() => normalizeActorItem({ ...row, startDateTime: "2030-01-01 8PM" }, "2026-10-25T00:00:00.000Z")).toThrow();
  expect(() => normalizeActorItem({ ...row, url: "https://example.org/?token=private" }, "2026-10-25T00:00:00.000Z")).toThrow();
});
test("source caps and date bounds are validated before an external run", () => {
  expect(validateActorInput({}).eventbriteCity).toBe("san-francisco");
  expect(validateActorInput({ maxDoTheBayEvents: 0 }).maxDoTheBayEvents).toBe(0);
  expect(() => validateActorInput({ maxLumaEvents: 0 })).toThrow();
  expect(() => validateActorInput({ daysAhead: 91 })).toThrow();
  expect(() => validateActorInput({ maxPartifulEvents: -1 })).toThrow();
  expect(() => validateActorInput({ maxDoTheBayEvents: Infinity })).toThrow();
});
test("older crawls cannot overwrite newer data and curated manual records are preserved", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.apifyStore.upsertPage, { items: [row] });
  expect((await t.mutation(internal.apifyStore.upsertPage, { items: [{ ...row, title: "Stale", collectedAt: "2026-10-23T00:00:00Z" }] })).skipped).toBe(1);
  await t.run(async ctx => { const doc = await ctx.db.query("events").first(); await ctx.db.patch("events", doc!._id, { sourceType: "manual", status: "approved" }); });
  expect((await t.mutation(internal.apifyStore.upsertPage, { items: [{ ...row, title: "Overwritten" }] })).skipped).toBe(1);
  expect((await t.query(api.apifyRead.list, {}))[0].title).toBe(row.title);
});
