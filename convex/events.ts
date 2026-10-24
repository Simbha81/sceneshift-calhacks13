import { query } from "./lib/server";
import { v } from "convex/values";
import { isMapVisible } from "../src/lib/eventValidation";
// Caller refreshes now every minute: Convex queries do not rerun just because time passes.
export const listApproved = query({ args: { now: v.number() }, handler: async (ctx, { now }) => {
 if (!Number.isFinite(now)) throw new Error("Invalid time");
 const events = await ctx.db.query("events").withIndex("by_status_start", q => q.eq("status", "approved").gt("startAt", new Date(now).toISOString())).take(100);
 return events.filter(event => isMapVisible(event, now));
}});
// Import and moderation writes intentionally await authenticated owner/role checks.
