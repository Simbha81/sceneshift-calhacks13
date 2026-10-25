import { defineApp } from "convex/server";
import { v } from "convex/values";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp({ env: {
  APIFY_TOKEN: v.optional(v.string()),
  ANTHROPIC_API_KEY: v.optional(v.string()),
  SCENESHIFT_MODERATOR_TOKEN: v.optional(v.string()),
} });
app.use(workflow);
export default app;
