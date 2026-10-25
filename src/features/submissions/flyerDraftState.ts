import type { FlyerDraft, FlyerOccurrence } from "../../lib/api";

export type FlyerReviewValues = {
  title: string;
  description: string;
  occurrences: Array<{ date: string; endDate: string; startTime: string; endTime: string }>;
  venueName: string;
  address: string;
  category: string;
  latitude: string;
  longitude: string;
  unresolvedFields: string[];
  reviewedFields: string[];
};

export function reviewValuesFromDraft(draft: FlyerDraft): FlyerReviewValues {
  const occurrences: FlyerOccurrence[] = draft.occurrences?.length ? draft.occurrences : [
    { date: draft.date, endDate: null, startTime: draft.startTime, endTime: draft.endTime },
  ];
  return {
    title: draft.title ?? "",
    description: draft.description ?? "",
    occurrences: occurrences.map(item => ({ date: item.date ?? "", endDate: item.endDate ?? "", startTime: item.startTime ?? "", endTime: item.endTime ?? "" })),
    venueName: draft.venueName ?? "",
    address: draft.address ?? "",
    category: draft.category ?? "",
    latitude: draft.latitude?.toString() ?? "",
    longitude: draft.longitude?.toString() ?? "",
    unresolvedFields: [...draft.unresolvedFields],
    reviewedFields: [...draft.reviewedFields],
  };
}

export function syncReviewValues(current: FlyerReviewValues, incoming: FlyerReviewValues, hasUnsavedChanges: boolean) {
  return hasUnsavedChanges ? current : incoming;
}

export function clearLocationReview(values: FlyerReviewValues, clearPoint: boolean): FlyerReviewValues {
  return { ...values, ...(clearPoint ? { latitude: "", longitude: "" } : {}),
    reviewedFields: values.reviewedFields.filter(key => key !== "venueCoordinates") };
}

export function publicationIssue(values: FlyerReviewValues): string | null {
  if (!values.title.trim() || !values.venueName.trim() || !values.address.trim()) return "Add a title, venue name, and street address before publishing.";
  if (!values.latitude || !values.longitude || !Number.isFinite(Number(values.latitude)) || !Number.isFinite(Number(values.longitude))) return "Find the address or tap the map to place the event pin before publishing.";
  if (!values.reviewedFields.includes("venueCoordinates")) return "Check the pin and confirm the event location before publishing.";
  if (values.unresolvedFields.length) return "Resolve or review each item under Needs confirmation before publishing.";
  if (values.occurrences.some(item => !item.date || !item.startTime)) return "Add a date and start time for every event occurrence before publishing.";
  return null;
}
