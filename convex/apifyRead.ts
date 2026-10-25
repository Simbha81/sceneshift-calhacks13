import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { source: v.optional(v.string()), from: v.optional(v.string()), to: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.array(v.object({ source: v.string(), title: v.string(), shortDescription: v.string(), startDateTime: v.string(),
    endDateTime: v.union(v.string(), v.null()), venue: v.union(v.string(), v.null()), address: v.union(v.string(), v.null()),
    priceStatus: v.string(), priceText: v.union(v.string(), v.null()), url: v.union(v.string(), v.null()),
    collectedAt: v.union(v.string(), v.null()), extra: v.any() })),
  handler: async (ctx, args) => {
    const lower = args.from ? Date.parse(args.from) : 0;
    const upper = args.to ? Date.parse(args.to) : Date.parse("2100-01-01T00:00:00Z");
    const limit = args.limit ?? 50;
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || upper <= lower || upper > 8640000000000000) throw new Error("Invalid date range");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be 1–100");
    if (args.source && args.source.length > 100) throw new Error("Invalid source");
    const from = new Date(lower).toISOString(), to = new Date(upper).toISOString();
    const rows = args.source
      ? await ctx.db.query("events").withIndex("by_status_and_source_and_startAt", q => q.eq("status", "approved").eq("source", args.source!).gte("startAt", from).lt("startAt", to)).take(limit)
      : await ctx.db.query("events").withIndex("by_status_start", q => q.eq("status", "approved").gte("startAt", from).lt("startAt", to)).take(limit);
    return rows.map(row => ({ source: row.source ?? row.sourceType, title: row.title,
      shortDescription: row.shortDescription ?? row.description, startDateTime: row.startAt, endDateTime: row.endAt ?? null,
      venue: row.venueName ?? null, address: row.address ?? null, priceStatus: row.priceType,
      priceText: row.priceText ?? null, url: row.url ?? row.sourceUrl ?? null, collectedAt: row.collectedAt ?? null,
      extra: { availability: row.availability ?? "unknown", estimatedEndAt: row.estimatedEndAt ?? null } }));
  },
});
