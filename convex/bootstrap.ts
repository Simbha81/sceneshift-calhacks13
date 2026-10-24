import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { reviewedEvents } from "../shared/reviewedEvents";
import { isMapVisible } from "../src/lib/eventValidation";

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
      await ctx.db.insert("events", event);
      result.inserted++;
    }
    return result;
  },
});
