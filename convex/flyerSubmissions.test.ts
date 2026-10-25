/// <reference types="vite/client" />
import { test, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { parseClaudeExtraction } from "./flyerParsing";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
const extraction = {
  title: "Test event", description: "A test event", date: "2030-01-01", startTime: "21:00", endTime: null,
  venueName: "Test venue", address: "1 Test St", category: "music-nightlife" as const, unresolvedFields: [] as string[], notes: "",
  occurrences: [{ date: "2030-01-01", endDate: null, startTime: "21:00", endTime: null }],
};
const { notes: _notes, ...savedExtraction } = extraction;
type Occurrence = { date: string | null; endDate: string | null; startTime: string | null; endTime: string | null };
type DraftUpdateArgs = {
  submissionId: Id<"flyerSubmissions">; title: string | null; description: string | null;
  date: string | null; startTime: string | null; endTime: string | null; occurrences: Occurrence[];
  venueName: string | null; address: string | null; category: "music-nightlife" | null;
  latitude: number | null; longitude: number | null; unresolvedFields: string[]; reviewedFields: string[];
};

async function newSubmission(t: ReturnType<typeof convexTest>) {
  const storageId = await t.run(ctx => ctx.storage.store(new Blob(["test flyer"], { type: "image/png" })));
  const submissionId = await t.mutation(api.flyerSubmissions.submit, { storageId });
  await t.mutation(internal.flyerSubmissions.markProcessing, { submissionId });
  return submissionId;
}

function updateArgs(submissionId: Id<"flyerSubmissions">, overrides: Partial<DraftUpdateArgs> = {}): DraftUpdateArgs {
  const occurrence = { date: "2030-01-01", endDate: null, startTime: "21:00", endTime: null, ...overrides.occurrences?.[0] };
  return {
    submissionId, title: "Test event", description: "A test event", date: occurrence.date,
    startTime: occurrence.startTime, endTime: occurrence.endTime,
    venueName: "Test venue", address: "1 Test St", category: "music-nightlife" as const,
    latitude: 37.76, longitude: -122.42, unresolvedFields: [] as string[], reviewedFields: ["venueCoordinates"],
    ...overrides, occurrences: overrides.occurrences ?? [occurrence],
  };
}

test("Claude parsing scans past introductory and earlier text blocks for the final structured event", () => {
  expect(parseClaudeExtraction([
    { type: "text", text: "Searching the web now. Here is the listing summary." },
    { type: "web_search_tool_result", content: [] },
    { type: "text", text: `I found the details. Final JSON:\n${JSON.stringify(extraction)}` },
  ])).toEqual(extraction);

  const earlier = { ...extraction, title: "Intermediate response" };
  expect(parseClaudeExtraction([
    { type: "text", text: JSON.stringify(earlier) },
    { type: "text", text: `Final answer: ${JSON.stringify(extraction)}` },
  ])).toEqual(extraction);
});

test("incomplete or malformed Claude output is rejected as a structured extraction", () => {
  expect(parseClaudeExtraction([{ type: "text", text: "I could not determine the event." }])).toBeNull();
  expect(parseClaudeExtraction([{ type: "text", text: '{"title":"Partial","occurrences":[' }])).toBeNull();
  expect(parseClaudeExtraction([{ type: "text", text: JSON.stringify({ title: "Not an event object" }) }])).toBeNull();
});

test("reviewer edits are blocked during extraction and late extraction cannot overwrite saved corrections", async () => {
  const t = convexTest(schema, modules);
  const submissionId = await newSubmission(t);
  await expect(t.mutation(internal.flyerSubmissions.updateDraftInternal, updateArgs(submissionId, { title: "Too early" })))
    .rejects.toThrow("Wait for flyer extraction to finish");

  await t.mutation(internal.flyerSubmissions.saveExtraction, { submissionId, extractionStatus: "complete", ...savedExtraction,
    latitude: 37.76, longitude: -122.42, extractionNotes: "" });
  await t.mutation(internal.flyerSubmissions.updateDraftInternal, updateArgs(submissionId, { title: "Reviewer correction" }));
  await t.mutation(internal.flyerSubmissions.saveExtraction, { submissionId, extractionStatus: "complete", ...savedExtraction,
    latitude: 37.76, longitude: -122.42, extractionNotes: "Late result" });
  expect(await t.run(async ctx => (await ctx.db.get(submissionId))?.title)).toBe("Reviewer correction");
});

test("end times before the start are rejected; next-day overnight times remain valid", async () => {
  const t = convexTest(schema, modules);
  const submissionId = await newSubmission(t);
  await t.mutation(internal.flyerSubmissions.saveExtraction, { submissionId, extractionStatus: "complete", ...savedExtraction,
    latitude: 37.76, longitude: -122.42, extractionNotes: "" });

  const invalid = updateArgs(submissionId, { endTime: "20:00", occurrences: [{ date: "2030-01-01", endDate: null, startTime: "21:00", endTime: "20:00" }] });
  await expect(t.mutation(internal.flyerSubmissions.updateDraftInternal, invalid)).rejects.toThrow("End time must be after start time");

  const overnight = updateArgs(submissionId, { endTime: "01:00", occurrences: [{ date: "2030-01-01", endDate: "2030-01-02", startTime: "21:00", endTime: "01:00" }] });
  await t.mutation(internal.flyerSubmissions.updateDraftInternal, overnight);
  await t.mutation(internal.flyerSubmissions.reviewInternal, { submissionId, decision: "approved" });
  const event = await t.run(async ctx => (await ctx.db.query("events").withIndex("by_sourceType_and_sourceEventId", q => q.eq("sourceType", "flyer").eq("sourceEventId", `${submissionId}:1`)).unique()));
  expect(event?.status).toBe("approved");
  expect(Date.parse(event?.endAt ?? "")).toBeGreaterThan(Date.parse(event?.startAt ?? ""));
  await expect(t.mutation(internal.flyerSubmissions.reviewInternal, { submissionId, decision: "approved" })).rejects.toThrow("Pending flyer was not found");
});

test("blank end time is allowed as unknown and uses the labeled three-hour estimate", async () => {
  const t = convexTest(schema, modules);
  const submissionId = await newSubmission(t);
  await t.mutation(internal.flyerSubmissions.saveExtraction, { submissionId, extractionStatus: "complete", ...savedExtraction,
    latitude: 37.76, longitude: -122.42, extractionNotes: "" });
  await t.mutation(internal.flyerSubmissions.updateDraftInternal, updateArgs(submissionId));
  await t.mutation(internal.flyerSubmissions.reviewInternal, { submissionId, decision: "approved" });
  const event = await t.run(async ctx => (await ctx.db.query("events").withIndex("by_sourceType_and_sourceEventId", q => q.eq("sourceType", "flyer").eq("sourceEventId", `${submissionId}:1`)).unique()));
  expect(event?.endAt).toBeNull();
  expect(event?.mapEndsAt).toBe(Date.parse(event?.startAt ?? "") + 3 * 60 * 60 * 1000);
});

test("bad moderator credentials are rejected", async () => {
  vi.stubEnv("SCENESHIFT_MODERATOR_TOKEN", "expected-test-token");
  try {
    const t = convexTest(schema, modules);
    await expect(t.action(api.flyerReview.listPending, { moderatorToken: "incorrect-test-token" })).rejects.toThrow("Moderator access denied");
  } finally { vi.unstubAllEnvs(); }
});
