import { v } from "convex/values";
export const actorInput = v.object({
  maxEventbriteEvents: v.optional(v.number()), maxPartifulEvents: v.optional(v.number()),
  maxLumaEvents: v.optional(v.number()), maxDoTheBayEvents: v.optional(v.number()),
  daysAhead: v.optional(v.number()), eventbriteCity: v.optional(v.string()), lumaCity: v.optional(v.string()),
});
// Optional fields preserve the existing map records during schema evolution.
export const importedFields = {
  source: v.optional(v.string()), shortDescription: v.optional(v.string()),
  startDateTime: v.optional(v.string()), endDateTime: v.optional(v.union(v.string(), v.null())),
  venue: v.optional(v.union(v.string(), v.null())), priceStatus: v.optional(v.string()),
  priceText: v.optional(v.union(v.string(), v.null())), url: v.optional(v.string()),
  collectedAt: v.optional(v.string()), extra: v.optional(v.any()),
};
export const importResult = v.object({ inserted: v.number(), updated: v.number(), skipped: v.number(),
  rejected: v.number(), errors: v.array(v.object({ index: v.number(), reason: v.string() })) });
