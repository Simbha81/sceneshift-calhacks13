import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { reviewedEvents } from "../shared/reviewedEvents";
import { isMapVisible } from "../src/lib/eventValidation";
import { eventEnd } from "../src/lib/eventLifecycle";

// Admin CLI/dashboard only. This is not the general Actor importer or moderation API.
export const importReviewed = internalMutation({
  args: {},
  returns: v.object({ inserted: v.number(), existing: v.number(), expired: v.number() }),
  handler: async (ctx) => {
    const result = { inserted: 0, existing: 0, expired: 0 };
    const now = Date.now();
    for (const event of reviewedEvents) {
      if (!isMapVisible(event, now)) { result.expired++; continue; }
      const found = await ctx.db.query("events")
        .withIndex("by_sourceType_and_sourceEventId", q =>
          q.eq("sourceType", event.sourceType).eq("sourceEventId", event.sourceEventId))
        .unique();
      // Preserve any subsequent edits or moderator decisions.
      if (found) { result.existing++; continue; }
      await ctx.db.insert("events", { ...event, mapEndsAt: eventEnd(event)!.timestamp });
      result.inserted++;
    }
    return result;
  },
});

// Optional-first schema migration. Existing event content/status is preserved.
// Repeat with the returned cursor until isDone; each transaction is bounded.
export const backfillVisibility = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({ updated: v.number(), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("events").withIndex("by_status_start")
      .paginate({ cursor: args.cursor, numItems: 100 });
    let updated = 0;
    for (const event of result.page) {
      const mapEndsAt = eventEnd(event)?.timestamp ?? null;
      if (event.mapEndsAt !== mapEndsAt) {
        await ctx.db.patch("events", event._id, { mapEndsAt });
        updated++;
      }
    }
    return { updated, continueCursor: result.continueCursor, isDone: result.isDone };
  },
});

// Admin-only acceptance-test helper. Restricted to the two bootstrap identities;
// this is not an application moderator endpoint. Compare state to avoid
// overwriting a concurrent review decision.
export const setReviewStatus = internalMutation({
  args: {
    sourceEventId: v.string(),
    expectedStatus: v.union(v.literal("approved"), v.literal("pending")),
    status: v.union(v.literal("approved"), v.literal("pending")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!reviewedEvents.some(event => event.sourceEventId === args.sourceEventId)) {
      throw new Error("Only reviewed bootstrap records may be used for this check");
    }
    const event = await ctx.db.query("events")
      .withIndex("by_sourceType_and_sourceEventId", q =>
        q.eq("sourceType", "manual").eq("sourceEventId", args.sourceEventId))
      .unique();
    if (!event) throw new Error("Bootstrap record not found");
    if (event.status === args.status) return null;
    if (event.status !== args.expectedStatus) throw new Error("Review status changed; check cancelled");
    await ctx.db.patch("events", event._id, { status: args.status });
    return null;
  },
});
