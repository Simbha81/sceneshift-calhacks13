import { v } from "convex/values";
import { action, env } from "./_generated/server";
import { internal } from "./_generated/api";

const category = v.union(
  v.literal("music-nightlife"), v.literal("arts-culture"), v.literal("markets-shopping"),
  v.literal("food-drink"), v.literal("community-causes"), v.literal("sports-outdoors"),
  v.literal("learning-hobbies"), v.literal("festivals-other"),
);
const nullableText = v.union(v.string(), v.null());
const flyerOccurrence = v.object({ date: nullableText, endDate: nullableText, startTime: nullableText, endTime: nullableText });
function checkModerator(token: string) {
  if (!env.SCENESHIFT_MODERATOR_TOKEN || token !== env.SCENESHIFT_MODERATOR_TOKEN) {
    throw new Error("Moderator access denied");
  }
}

export const listPending = action({
  args: { moderatorToken: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { moderatorToken }): Promise<any[]> => {
    checkModerator(moderatorToken);
    return await ctx.runQuery(internal.flyerSubmissions.listPendingInternal, {});
  },
});

export const updateDraft = action({
  args: {
    moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"),
    title: nullableText, description: nullableText, date: nullableText, startTime: nullableText,
    endTime: nullableText, occurrences: v.array(flyerOccurrence), venueName: nullableText, address: nullableText,
    category: v.union(category, v.null()), latitude: v.union(v.number(), v.null()),
    longitude: v.union(v.number(), v.null()), unresolvedFields: v.array(v.string()),
    reviewedFields: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { moderatorToken, ...input } = args;
    checkModerator(moderatorToken);
    return await ctx.runMutation(internal.flyerSubmissions.updateDraftInternal, input);
  },
});

export const review = action({
  args: {
    moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { moderatorToken, submissionId, decision } = args;
    checkModerator(moderatorToken);
    return await ctx.runMutation(internal.flyerSubmissions.reviewInternal, { submissionId, decision });
  },
});
