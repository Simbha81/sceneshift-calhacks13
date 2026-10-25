"use node";
import { internalAction, env } from "./_generated/server";
import { v } from "convex/values";
import { actorInput } from "./apifyModel";
import { validateActorInput } from "../shared/apifyNormalization";
const ACTOR_ID = "6sdtaCC2do1B7febX";
type ActorRun = { id: string; actId: string; status: string; defaultDatasetId?: string; startedAt?: string };
async function request(path: string, init?: RequestInit): Promise<Response> {
  const token = env.APIFY_TOKEN?.trim();
  if (!token) throw new Error("APIFY_TOKEN is not configured in the Convex server environment");
  let response: Response;
  try {
    response = await fetch(`https://api.apify.com/v2/${path}`, {
      ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
    });
  } catch { throw new Error("Apify network request failed; inspect recent runs before retrying a start"); }
  if (!response.ok) {
    const status = response.status;
    await response.body?.cancel();
    throw new Error(`Apify API returned HTTP ${status}`);
  }
  return response;
}
async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  try { return ((await response.json()) as { data: T }).data; }
  catch { throw new Error("Apify returned an invalid JSON response"); }
}
function validateRunId(runId: string) {
  if (!/^[a-zA-Z0-9]{1,64}$/.test(runId)) throw new Error("Invalid run ID");
}
const runResult = v.object({ runId: v.string(), status: v.string(), datasetId: v.union(v.string(), v.null()) });
export const inspect = internalAction({
  args: {}, returns: v.object({ tokenConfigured: v.boolean(), actorAccessible: v.boolean(), actorName: v.union(v.string(), v.null()), httpStatus: v.union(v.number(), v.null()), errorCategory: v.union(v.string(), v.null()) }),
  handler: async () => {
    if (!env.APIFY_TOKEN?.trim()) return { tokenConfigured: false, actorAccessible: false, actorName: null, httpStatus: null, errorCategory: "missing-token" };
    try {
      const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}`, {
        headers: { Authorization: `Bearer ${env.APIFY_TOKEN.trim()}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const status = response.status;
        await response.body?.cancel();
        return { tokenConfigured: true, actorAccessible: false, actorName: null, httpStatus: status,
          errorCategory: status === 401 ? "authentication" : status === 403 ? "permissions"
            : status === 404 ? "not-found" : status === 429 ? "rate-limit" : "api-error" };
      }
      const body = await response.json() as { data?: { name?: string } };
      const actor = body.data;
      return { tokenConfigured: true, actorAccessible: !!actor, actorName: actor?.name ?? null, httpStatus: actor ? 200 : 404, errorCategory: actor ? null : "not-found" };
    } catch (error: unknown) {
      // Return only fixed categories and numeric status; SDK errors can contain credentials.
      const status = typeof error === "object" && error !== null && "statusCode" in error
        && typeof error.statusCode === "number" ? error.statusCode : null;
      const code = typeof error === "object" && error !== null && "code" in error
        && typeof error.code === "string" ? error.code : "";
      const errorCategory = status === 401 ? "authentication" : status === 403 ? "permissions"
        : status === 404 ? "not-found" : status === 429 ? "rate-limit"
        : status !== null ? "api-error" : ["ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED"].includes(code)
        ? "network" : "client-or-network";
      return { tokenConfigured: true, actorAccessible: false, actorName: null, httpStatus: status, errorCategory };
    }
  },
});
export const recentRuns = internalAction({
  args: {}, returns: v.array(v.object({ runId: v.string(), status: v.string(), datasetId: v.union(v.string(), v.null()), startedAt: v.union(v.string(), v.null()) })),
  handler: async () => {
    const result = await data<{ items: ActorRun[] }>(`acts/${ACTOR_ID}/runs?limit=10&desc=true`);
    return result.items.map(run => ({ runId: run.id, status: run.status, datasetId: run.defaultDatasetId ?? null, startedAt: run.startedAt ?? null }));
  },
});
export const startRun = internalAction({
  args: { input: actorInput }, returns: runResult,
  handler: async (_ctx, { input }) => {
    // Never retry POST automatically: its outcome may be unknown after a network error.
    const run = await data<ActorRun>(`acts/${ACTOR_ID}/runs?timeout=300&maxItems=1000&maxTotalChargeUsd=1`,
      { method: "POST", body: JSON.stringify(validateActorInput(input)) });
    return { runId: run.id, status: run.status, datasetId: run.defaultDatasetId ?? null };
  },
});
export const pollRun = internalAction({
  args: { runId: v.string() }, returns: runResult,
  handler: async (_ctx, { runId }) => {
    validateRunId(runId);
    const run = await data<ActorRun>(`actor-runs/${runId}?waitForFinish=20`);
    if (run.actId !== ACTOR_ID) throw new Error("Run belongs to a different Actor");
    return { runId: run.id, status: run.status, datasetId: run.defaultDatasetId ?? null };
  },
});
export const fetchPage = internalAction({
  args: { runId: v.string(), offset: v.number(), limit: v.number() },
  returns: v.object({ items: v.array(v.any()), total: v.number() }),
  handler: async (_ctx, { runId, offset, limit }) => {
    validateRunId(runId);
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000
      || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid dataset page");
    const run = await data<ActorRun>(`actor-runs/${runId}`);
    if (run.actId !== ACTOR_ID || run.status !== "SUCCEEDED" || !run.defaultDatasetId) throw new Error("Run not importable");
    if (!/^[a-zA-Z0-9]+$/.test(run.defaultDatasetId)) throw new Error("Invalid dataset ID");
    const response = await request(`datasets/${run.defaultDatasetId}/items?format=json&clean=true&offset=${offset}&limit=${limit}`);
    const items: unknown = await response.json();
    if (!Array.isArray(items) || items.length > limit) throw new Error("Invalid dataset page response");
    const headerTotal = response.headers.get("x-apify-pagination-total");
    let total = headerTotal === null ? NaN : Number(headerTotal);
    if (!Number.isInteger(total) || total < 0) {
      const dataset = await data<{ itemCount: number }>(`datasets/${run.defaultDatasetId}`);
      total = dataset.itemCount;
    }
    if (!Number.isInteger(total) || total < offset + items.length) throw new Error("Invalid dataset total");
    return { items, total };
  },
});
