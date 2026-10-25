import { test } from "node:test";
import assert from "node:assert/strict";
import type { FlyerReviewValues } from "../src/features/submissions/flyerDraftState";
import { syncReviewValues } from "../src/features/submissions/flyerDraftState";

const emptyValues: FlyerReviewValues = {
  title: "", description: "", occurrences: [{ date: "", endDate: "", startTime: "", endTime: "" }],
  venueName: "", address: "", category: "", latitude: "", longitude: "",
  unresolvedFields: ["title", "date"], reviewedFields: [],
};
const extractedValues: FlyerReviewValues = {
  ...emptyValues, title: "Extracted event", occurrences: [{ date: "2026-11-01", endDate: "", startTime: "11:00", endTime: "" }],
  unresolvedFields: [],
};

test("review form refresh fills extracted fields after queued extraction completes", () => {
  assert.deepEqual(syncReviewValues(emptyValues, extractedValues, false), extractedValues);
});

test("review form refresh preserves unsaved reviewer edits", () => {
  const reviewerEdits = { ...emptyValues, title: "My correction", address: "Corrected address" };
  assert.equal(syncReviewValues(reviewerEdits, extractedValues, true), reviewerEdits);
});
