import { defineSchema, defineTable, type DataModelFromSchemaDefinition } from "convex/server";
import { eventValidator } from "../src/lib/eventValidation";
import { importedFields } from "./apifyModel";
const schema = defineSchema({ events: defineTable(eventValidator.extend(importedFields))
  .index("by_url", ["url"])
  .index("by_sourceUrl", ["sourceUrl"])
  .index("by_status_and_source_and_startAt", ["status", "source", "startAt"])
  .index("by_status_start", ["status", "startAt"])
  .index("by_status_and_mapEndsAt", ["status", "mapEndsAt"])
  .index("by_sourceType_and_sourceEventId", ["sourceType", "sourceEventId"]) });
export default schema;
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
