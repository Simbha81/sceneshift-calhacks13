"use node";
import { ApifyClient } from "apify-client";
import { internalAction, env } from "./_generated/server";
import { v } from "convex/values";
import { actorInput } from "./apifyModel";
import { validateActorInput } from "../shared/apifyNormalization";
const ACTOR_ID = "6sdtaCC2do1B7febX";
function client() {
  if (!env.APIFY_TOKEN?.trim()) throw new Error("APIFY_TOKEN is not configured in the Convex server environment");
  // No transport retry on POST: a lost response could otherwise start two paid runs.
  return new ApifyClient({ token: env.APIFY_TOKEN, maxRetries: 0, timeoutSecs: 30 });
}
function failure(operation: string): never {
  // Do not propagate SDK errors, response bodies, request headers, or tokens.
  throw new Error(`Apify ${operation} failed. Check server token permissions and Actor access in Apify Console.`);
}
const runResult = v.object({ runId: v.string(), status: v.string(), datasetId: v.union(v.string(), v.null()) });
export const inspect = internalAction({
  args: {}, returns: v.object({ tokenConfigured: v.boolean(), actorAccessible: v.boolean(), actorName: v.union(v.string(), v.null()) }),
  handler: async () => {
    if (!env.APIFY_TOKEN?.trim()) return { tokenConfigured: false, actorAccessible: false, actorName: null };
    try {
      const actor = await client().actor(ACTOR_ID).get();
      return { tokenConfigured: true, actorAccessible: !!actor, actorName: actor?.name ?? null };
    } catch { return { tokenConfigured: true, actorAccessible: false, actorName: null }; }
  },
});
export const startRun = internalAction({
  args: { input: actorInput }, returns: runResult,
  handler: async (_ctx, { input }) => {
    const normalized = validateActorInput(input);
    const api = client();
    try {
      const run = await api.actor(ACTOR_ID).start(normalized, { timeout: 300, maxItems: 1000, maxTotalChargeUsd: 1 });
      return { runId: run.id, status: run.status, datasetId: run.defaultDatasetId ?? null };
    } catch { return failure("start (request outcome may be unknown; inspect recent runs before restarting)"); }
  },
});
export const pollRun = internalAction({
  args: { runId: v.string() }, returns: runResult,
  handler: async (_ctx, { runId }) => {
    if (!/^[a-zA-Z0-9]{1,64}$/.test(runId)) throw new Error("Invalid run ID");
    const api = client();
    try {
      const initial = await api.run(runId).get();
      if (!initial || initial.actId !== ACTOR_ID) throw new Error("Wrong Actor");
      const run = await api.run(runId).waitForFinish({ waitSecs: 20 });
      return { runId: run.id, status: run.status, datasetId: run.defaultDatasetId ?? null };
    } catch { return failure("poll"); }
  },
});
export const fetchPage = internalAction({
  args: { runId: v.string(), offset: v.number(), limit: v.number() },
  returns: v.object({ items: v.array(v.any()), total: v.number() }),
  handler: async (_ctx, { runId, offset, limit }) => {
    if (!/^[a-zA-Z0-9]{1,64}$/.test(runId) || !Number.isInteger(offset) || offset < 0 || offset > 10000
      || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid dataset page");
    const api = client();
    try {
      const run = await api.run(runId).get();
      if (!run || run.actId !== ACTOR_ID || run.status !== "SUCCEEDED" || !run.defaultDatasetId) throw new Error("Run not importable");
      const page = await api.dataset(run.defaultDatasetId).listItems({ limit, offset, clean: true });
      return { items: page.items, total: page.total };
    } catch { return failure("dataset read"); }
  },
});
