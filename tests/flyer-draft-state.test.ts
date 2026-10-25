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

test("changing the address clears the old point and location confirmation", async () => {
  const { clearLocationReview } = await import("../src/features/submissions/flyerDraftState");
  const values = { ...extractedValues, latitude: "37.75", longitude: "-122.42", reviewedFields: ["date", "venueCoordinates"] };
  const changed = clearLocationReview(values, true);
  assert.equal(changed.latitude, ""); assert.equal(changed.longitude, "");
  assert.deepEqual(changed.reviewedFields, ["date"]);
  const moved = clearLocationReview(values, false);
  assert.equal(moved.latitude, "37.75"); assert.deepEqual(moved.reviewedFields, ["date"]);
});

test("publication explains missing pin even when an old location checkbox was checked", async () => {
  const { publicationIssue } = await import("../src/features/submissions/flyerDraftState");
  const values = { ...extractedValues, venueName: "Street fair", address: "2nd Street, SF", reviewedFields: ["venueCoordinates"] };
  assert.match(publicationIssue(values) ?? "", /place the event pin/);
  assert.equal(publicationIssue({ ...values, latitude: "37.78", longitude: "-122.40" }), null);
});
