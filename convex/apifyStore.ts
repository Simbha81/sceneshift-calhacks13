import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeActorItem } from "../shared/apifyNormalization";
import { importResult } from "./apifyModel";

export const upsertPage = internalMutation({
  args: { items: v.array(v.any()) }, returns: importResult,
  handler: async (ctx, { items }) => {
    if (items.length > 100) throw new Error("Import pages are limited to 100 items");
    const result = { inserted: 0, updated: 0, skipped: 0, rejected: 0, errors: [] as { index: number; reason: string }[] };
    const importedAt = new Date().toISOString();
    for (const [index, item] of items.entries()) {
      let row;
      try { row = normalizeActorItem(item, importedAt); }
      catch (error) {
        result.rejected++;
        result.errors.push({ index, reason: error instanceof Error ? error.message : "Invalid record" });
        continue;
      }
      const old = await ctx.db.query("events").withIndex("by_url", q => q.eq("url", row.url)).unique()
        ?? await ctx.db.query("events").withIndex("by_sourceUrl", q => q.eq("sourceUrl", row.url)).unique();
      if (!old) { await ctx.db.insert("events", row); result.inserted++; continue; }
      if (old.sourceType !== "apify" || (old.collectedAt && old.collectedAt > row.collectedAt)) { result.skipped++; continue; }
      const oldExtra = old.extra && typeof old.extra === "object" && !Array.isArray(old.extra)
        ? old.extra as Record<string, unknown> : {};
      const review = oldExtra.review;
      const priorReview = review ?? oldExtra.previousReview;
      if (review && old.collectedAt === row.collectedAt) { result.skipped++; continue; }
      const changed = old.title !== row.title || old.startAt !== row.startAt || old.endAt !== row.endAt
        || old.address !== row.address || old.venueName !== row.venueName
        || old.latitude !== row.latitude || old.longitude !== row.longitude
        || old.priceType !== row.priceType;
      // Never resurrect a rejected record; changed approved facts require review.
      const status = old.status === "approved" && changed ? "pending" : old.status;
      await ctx.db.patch("events", old._id, { ...row, extra: { ...row.extra, ...(priorReview ? (changed || old.status !== "approved" ? { previousReview: priorReview } : { review: priorReview }) : {}) }, status, verified: changed ? false : old.verified });
      result.updated++;
    }
    return result;
  },
});
