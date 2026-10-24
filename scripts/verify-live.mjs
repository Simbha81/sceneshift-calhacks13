import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

// Run from the repository root. Uses admin CLI auth only for the internal writes;
// both subscriptions use public browsing access, as the React app does.
const config = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const split = line.indexOf("=");
    return [line.slice(0, split), line.slice(split + 1).split("#")[0].trim()];
  }));
const deployment = config.CONVEX_DEPLOYMENT;
if (!deployment?.startsWith("dev:") || process.env.CONVEX_DEPLOY_KEY || process.env.CONVEX_DEPLOYMENT) {
  throw new Error("Use a local dev deployment configuration without environment overrides");
}
const name = deployment.slice(4);
const url = config.VITE_CONVEX_URL;
if (url !== `https://${name}.convex.cloud`) throw new Error("Deployment and frontend URL do not match");
console.log(`Target: ${deployment}; two public subscription clients`);

const clients = [new ConvexClient(url), new ConvexClient(url)];
const snapshots = [null, null];
const query = makeFunctionReference("events:listApproved");
const args = { now: Date.now() };
let subscriptionError;
const unsubscribes = clients.map((client, index) => client.onUpdate(query, args,
  rows => { snapshots[index] = rows; }, error => { subscriptionError = error; }));
async function waitFor(predicate, label) {
  const deadline = Date.now() + 20000;
  while (!predicate()) {
    if (subscriptionError) throw subscriptionError;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log(`PASS: ${label}`);
}
function setStatus(sourceEventId, expectedStatus, status) {
  execFileSync("npx", ["convex", "run", "bootstrap:setReviewStatus",
    JSON.stringify({ sourceEventId, expectedStatus, status })], { timeout: 20000, stdio: "pipe" });
}
let target;
let changed = false;
try {
  await waitFor(() => snapshots.every(rows => rows !== null), "both clients received initial query");
  target = snapshots[0].find(event => event.sourceType === "manual" &&
    ["foodwise:ferry-plaza:2026-10-24", "aim:clement:2026-10-25"].includes(event.sourceEventId));
  if (!target) throw new Error("No unended approved bootstrap occurrence is available; do not move dates forward");
  if (!snapshots[1].some(event => event._id === target._id)) throw new Error("Initial client data differs");
  // Mark before the request: if a response is lost after commit, still restore.
  changed = true;
  setStatus(target.sourceEventId, "approved", "pending");
  await waitFor(() => snapshots.every(rows => !rows.some(event => event._id === target._id)),
    "pending record disappeared from both subscriptions without refresh");
} finally {
  try {
    if (changed) {
      setStatus(target.sourceEventId, "pending", "approved");
      changed = false;
      await waitFor(() => snapshots.every(rows => rows?.some(event => event._id === target._id)),
        "approval restored the record in both subscriptions without refresh");
    }
  } finally {
    unsubscribes.forEach(unsubscribe => unsubscribe());
    await Promise.all(clients.map(client => client.close()));
    if (changed) console.error("Restoration was not confirmed. Inspect the bootstrap record status before continuing.");
  }
}
