import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { canonicalEventUrl } from "../shared/apifyNormalization";
import { eventEnd } from "../src/lib/eventLifecycle";
import { isMapVisible } from "../src/lib/eventValidation";

// Admin CLI/dashboard only; this does not expose public moderation permissions.
export const approve = internalMutation({
  args: { eventId: v.id("events"), expectedCollectedAt: v.string(), evidenceUrls: v.array(v.string()), notes: v.string() },
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
    if (event.status === "approved") return null;
    if (event.status !== "pending") throw new Error("Only pending events can be approved");
    if (Array.isArray(extra.warnings) && extra.warnings.length) throw new Error("Resolve import warnings before approval");
    const mapEndsAt = eventEnd(event)?.timestamp ?? null;
    if (!isMapVisible({ ...event, status: "approved" }, Date.now())) throw new Error("Event is expired or has unresolved coordinates/timing");
    await ctx.db.patch(event._id, { status: "approved", verified: true, mapEndsAt,
      extra: { ...extra, review: { evidenceUrls, notes: args.notes.trim(), checkedAt: new Date().toISOString() } } });
    return null;
  },
});
