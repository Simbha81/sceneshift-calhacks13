import { WorkflowManager, vWorkflowId, type WorkflowId } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { actorInput } from "./apifyModel";
import { validateActorInput } from "../shared/apifyNormalization";

export const manager = new WorkflowManager(components.workflow, {
  workpoolOptions: { defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 } },
});
const syncArgs = { input: actorInput, existingRunId: v.optional(v.string()), maxItems: v.optional(v.number()) };
export const perform = manager.define({
  args: syncArgs,
  handler: async (step, args): Promise<{ runId: string; datasetId: string | null; fetched: number; inserted: number; updated: number; skipped: number; rejected: number; truncated: boolean }> => {
    const input = validateActorInput(args.input);
    const maxItems = args.maxItems ?? 1000;
    if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 10000) throw new Error("maxItems must be 1–10000");
    let run: { runId: string; status: string; datasetId: string | null } = args.existingRunId
      ? { runId: args.existingRunId, status: "RUNNING", datasetId: null }
      : await step.runAction(internal.apifyApi.startRun, { input }, { retry: false });
    const terminal = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];
    for (let attempt = 0; !terminal.includes(run.status) && attempt < 60; attempt++) {
      run = await step.runAction(internal.apifyApi.pollRun, { runId: run.runId }, { retry: true, runAfter: 2000 });
    }
    if (run.status !== "SUCCEEDED") throw new Error(`Apify run ${run.runId} ended or stopped waiting with status ${run.status}; resume with existingRunId after inspection`);
    if (!run.datasetId) throw new Error("Successful run has no dataset");
    const result = { runId: run.runId, datasetId: run.datasetId, fetched: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, truncated: false };
    for (let offset = 0; offset < maxItems;) {
      const page: { items: unknown[]; total: number } = await step.runAction(internal.apifyApi.fetchPage,
        { runId: run.runId, offset, limit: Math.min(100, maxItems - offset) }, { retry: true });
      if (!page.items.length) break;
      const imported = await step.runMutation(internal.apifyStore.upsertPage, { items: page.items });
      for (const key of ["inserted", "updated", "skipped", "rejected"] as const) result[key] += imported[key];
      offset += page.items.length; result.fetched = offset;
      result.truncated = page.total > offset;
      if (offset >= page.total) break;
    }
    return result;
  },
});
// Admin CLI only. No unauthenticated endpoint can trigger paid Actor runs.
export const sync = internalAction({
  args: syncArgs, returns: vWorkflowId,
  handler: async (ctx, args): Promise<WorkflowId> => {
    const input = validateActorInput(args.input);
    if (args.maxItems !== undefined && (!Number.isInteger(args.maxItems) || args.maxItems < 1 || args.maxItems > 10000)) throw new Error("maxItems must be 1–10000");
    return await manager.start(ctx, internal.apifySync.perform, { ...args, input }, { startAsync: true });
  },
});
export const status = internalQuery({
  args: { workflowId: vWorkflowId }, returns: v.any(),
  handler: async (ctx, { workflowId }) => await manager.status(ctx, workflowId),
});
