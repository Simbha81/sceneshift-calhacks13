import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { canonicalEventUrl } from "../shared/apifyNormalization";
import { eventEnd } from "../src/lib/eventLifecycle";
import { isMapVisible, eventValidator } from "../src/lib/eventValidation";

// Admin CLI/dashboard only; this does not expose public moderation permissions.
export const approve = internalMutation({
  args: { eventId: v.id("events"), expectedCollectedAt: v.string(), evidenceUrls: v.array(v.string()), notes: v.string(), corrections: v.optional(v.object({ priceType: v.optional(eventValidator.fields.priceType), priceText: v.optional(v.string()), categories: v.optional(eventValidator.fields.categories), description: v.optional(v.string()), startAt: v.optional(v.string()), endAt: v.optional(v.union(v.string(), v.null())) })) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.notes.trim() || args.notes.length > 2000 || args.evidenceUrls.length < 1 || args.evidenceUrls.length > 5) {
      throw new Error("A bounded source review with notes and evidence is required");
    }
    const evidenceUrls = args.evidenceUrls.map(canonicalEventUrl);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.sourceType !== "apify") throw new Error("Imported event not found");
    if (event.collectedAt !== args.expectedCollectedAt) throw new Error("Event was recollected; review the latest data");
    const extra = event.extra && typeof event.extra === "object" && !Array.isArray(event.extra) ? event.extra as Record<string, unknown> : {};
    if (event.status === "approved" && !args.corrections) return null;
    if (event.status !== "pending" && event.status !== "approved") throw new Error("Rejected events cannot be approved");
    const corrections = args.corrections ?? {};
    if ((corrections.priceText?.length ?? 0) > 500 || (corrections.description?.length ?? 0) > 5000 || (corrections.categories?.length ?? 0) > 8) throw new Error("Review corrections exceed bounds");
    const warnings = Array.isArray(extra.warnings) ? extra.warnings.filter(warning =>
      !(corrections.priceType !== undefined && typeof warning === "string" && /price/i.test(warning))) : [];
    if (warnings.length) throw new Error("Resolve import warnings before approval");
    for (const value of [corrections.startAt, corrections.endAt]) {
      if (value !== undefined && value !== null && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)) throw new Error("Corrections require canonical UTC timestamps");
    }
    const corrected = { ...event, ...corrections };
    if (corrected.endAt && corrected.endAt <= corrected.startAt) throw new Error("End must follow start");
    const mapEndsAt = eventEnd(corrected)?.timestamp ?? null;
    if (!isMapVisible({ ...corrected, status: "approved" }, Date.now())) throw new Error("Event is expired or has unresolved coordinates/timing");
    await ctx.db.patch(event._id, { ...corrections,
      ...(corrections.priceType !== undefined ? { priceStatus: corrections.priceType } : {}),
      ...(corrections.startAt !== undefined ? { startDateTime: corrections.startAt } : {}),
      ...(corrections.endAt !== undefined ? { endDateTime: corrections.endAt } : {}),
      ...(corrections.description !== undefined ? { shortDescription: corrections.description } : {}),
      status: "approved", verified: true, mapEndsAt,
      extra: { ...extra, warnings, review: { evidenceUrls, notes: args.notes.trim(), corrections, originalPriceType: event.priceType, originalStartAt: event.startAt, checkedAt: new Date().toISOString() } } });
    return null;
  },
});
