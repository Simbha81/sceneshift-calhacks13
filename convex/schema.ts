import { defineSchema, defineTable, type DataModelFromSchemaDefinition } from "convex/server";
import { v } from "convex/values";
import { eventValidator } from "../src/lib/eventValidation";
import { importedFields } from "./apifyModel";

const category = v.union(
  v.literal("music-nightlife"), v.literal("arts-culture"), v.literal("markets-shopping"),
  v.literal("food-drink"), v.literal("community-causes"), v.literal("sports-outdoors"),
  v.literal("learning-hobbies"), v.literal("festivals-other"),
);
const schema = defineSchema({
  events: defineTable(eventValidator.extend(importedFields))
    .index("by_url", ["url"])
    .index("by_sourceUrl", ["sourceUrl"])
    .index("by_status_and_source_and_startAt", ["status", "source", "startAt"])
    .index("by_status_start", ["status", "startAt"])
    .index("by_status_and_mapEndsAt", ["status", "mapEndsAt"])
    .index("by_sourceType_and_sourceEventId", ["sourceType", "sourceEventId"]),
  flyerSubmissions: defineTable({
    imageStorageId: v.id("_storage"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    extractionStatus: v.union(v.literal("queued"), v.literal("processing"), v.literal("complete"), v.literal("failed")),
    title: v.union(v.string(), v.null()),
    description: v.union(v.string(), v.null()),
    date: v.union(v.string(), v.null()),
    startTime: v.union(v.string(), v.null()),
    endTime: v.union(v.string(), v.null()),
    venueName: v.union(v.string(), v.null()),
    address: v.union(v.string(), v.null()),
    category: v.union(category, v.null()),
    latitude: v.union(v.number(), v.null()),
    longitude: v.union(v.number(), v.null()),
    unresolvedFields: v.array(v.string()),
    reviewedFields: v.array(v.string()),
    extractionNotes: v.string(),
    eventId: v.optional(v.id("events")),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  }).index("by_status_createdAt", ["status", "createdAt"]),
});
export default schema;
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
