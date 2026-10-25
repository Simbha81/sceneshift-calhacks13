import { makeFunctionReference } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import type { LocalEvent, EventCategory } from "./event";
export const listApproved = makeFunctionReference<"query", { now: number }, LocalEvent[]>("events:listApproved");
export type FlyerOccurrence = { date: string | null; endDate: string | null; startTime: string | null; endTime: string | null };
export type FlyerDraft = {
  _id: Id<"flyerSubmissions">; imageUrl: string | null; imageStorageId: Id<"_storage">;
  status: "pending" | "approved" | "rejected"; extractionStatus: "queued" | "processing" | "complete" | "failed";
  title: string | null; description: string | null; date: string | null; startTime: string | null;
  endTime: string | null; venueName: string | null; address: string | null; category: EventCategory | null;
  latitude: number | null; longitude: number | null; unresolvedFields: string[]; reviewedFields: string[];
  extractionNotes: string; createdAt: number; eventId?: Id<"events">; eventIds?: Id<"events">[];
  occurrences?: FlyerOccurrence[];
};
type DraftFields = Omit<Pick<FlyerDraft, "title" | "description" | "date" | "startTime" | "endTime" |
  "occurrences" | "venueName" | "address" | "category" | "latitude" | "longitude" | "unresolvedFields" | "reviewedFields">, "occurrences"> & {
    occurrences: FlyerOccurrence[];
  };
export const generateFlyerUploadUrl = makeFunctionReference<"mutation", Record<string, never>, string>("flyerSubmissions:generateUploadUrl");
export const submitFlyer = makeFunctionReference<"mutation", { storageId: Id<"_storage"> }, Id<"flyerSubmissions">>("flyerSubmissions:submit");
export const listPendingFlyers = makeFunctionReference<"action", { moderatorToken: string }, FlyerDraft[]>("flyerReview:listPending");
export const updateFlyerDraft = makeFunctionReference<"action", { moderatorToken: string; submissionId: Id<"flyerSubmissions"> } & DraftFields, null>("flyerReview:updateDraft");
export type FlyerAddressMatch = { label: string; latitude: number; longitude: number };
export const lookupFlyerAddress = makeFunctionReference<"action", { moderatorToken: string; address: string }, FlyerAddressMatch[]>("flyerReview:lookupAddress");
export const reviewFlyer = makeFunctionReference<"action", { moderatorToken: string; submissionId: Id<"flyerSubmissions">; decision: "approved" | "rejected" }, null>("flyerReview:review");
