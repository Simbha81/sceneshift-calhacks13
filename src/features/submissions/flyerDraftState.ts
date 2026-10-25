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
