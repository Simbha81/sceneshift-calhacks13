import { defineSchema, defineTable, type DataModelFromSchemaDefinition } from "convex/server";
import { eventValidator } from "../src/lib/eventValidation";
const schema = defineSchema({ events: defineTable(eventValidator).index("by_status_start", ["status", "startAt"]) });
export default schema;
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
