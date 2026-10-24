import { query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";
import { isMapVisible } from "../src/lib/eventValidation";

// The client supplies time and refreshes at start/end/ending-soon boundaries.
export const listApproved = query({
  args: { now: v.number() },
  returns: v.array(schema.doc("events")),
  handler: async (ctx, { now }) => {
    if (!Number.isFinite(now) || now < 0 || now > 8640000000000000) throw new Error("Invalid time");
    const events = await ctx.db.query("events")
      .withIndex("by_status_and_mapEndsAt", q => q.eq("status", "approved")
        .gt("mapEndsAt", now).lte("mapEndsAt", 8640000000000000))
      .take(100);
    return events.filter(event => isMapVisible(event, now));
  },
});
// Import and moderation writes intentionally await authenticated owner/role checks.
