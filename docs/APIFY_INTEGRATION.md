# EventPulse → Convex

Uses the existing Convex project and `events` table. Actor: `onsra888/sceneshift-eventpulse`, ID `6sdtaCC2do1B7febX`.

## Setup

Set `APIFY_TOKEN` in the **Convex dashboard → development deployment → Settings → Environment Variables**. It must have access to the Actor, its runs, and datasets. Do not put it in a VITE_ variable, client code, Git, a URL, or chat. The SDK authenticates with a bearer header. `.env.local` identifies the Convex deployment; it is not where deployed functions read secrets.

Install the repo's locked dependencies, then deploy the backend:

```sh
pnpm install --frozen-lockfile
npx convex dev --once
npx convex run apifyApi:inspect '{}'
```

## Run one sync

```sh
npx convex run apifySync:sync '{"input":{"maxEventbriteEvents":5,"maxPartifulEvents":1,"maxLumaEvents":5,"maxDoTheBayEvents":5,"daysAhead":14,"eventbriteCity":"san-francisco","lumaCity":"sf"},"maxItems":1000}'
```

Returns a workflow ID immediately. It starts one Actor run, polls until terminal, obtains defaultDatasetId, reads pages of at most 100 items with limit/offset, and upserts valid items by canonical URL. Check progress/result:

```sh
npx convex run apifySync:status '{"workflowId":"RETURNED_WORKFLOW_ID"}'
```

Terminal FAILED/ABORTED/TIMED-OUT runs are not imported. A single Actor run is limited to 300 seconds; polling has a finite step budget. Each polling/read step can retry. The external POST start step does not retry because a lost response might already have started a paid run. Inspect Apify's recent runs before restarting after an ambiguous POST failure.

To import/resume a known successful run without starting another:

```sh
npx convex run apifySync:sync '{"input":{},"existingRunId":"APIFY_RUN_ID","maxItems":1000}'
```

The run must belong to the configured Actor and have succeeded. Dataset reads are limited to maxItems (1–10000; default 1000); the final result reports truncation if more items exist. Partial imported pages remain if a later step fails; replay/upsert prevents duplicate rows.

## Important Actor schema differences

Public build `0.0.13` was confirmed SUCCEEDED. Its schema requires Eventbrite, Partiful, and Luma caps >=1. **Only maxDoTheBayEvents accepts 0 as unlimited**. The integration follows the actual build rather than passing invalid zero values. Defaults are finite. The schema describes daysAhead as DoTheBay-specific, not a global source date filter, and says Partiful records are dropped by its address filter. These are Actor limitations to fix separately. The Actor still has template README/metadata; customize those before presenting it as a polished reusable Actor.

The SDK sets maxItems=1000 and maxTotalChargeUsd=1 on new runs. These apply only to the corresponding Apify billing models and do not guarantee total compute/nested-Actor costs. Source caps and timeout provide additional bounds. No unrestricted public sync trigger is exposed.

## Storage and review

Requested fields `source`, `title`, `shortDescription`, `startDateTime`, `endDateTime`, `venue`, `address`, `priceStatus`, `priceText`, `url`, `collectedAt`, `extra` are stored alongside the existing map fields. New fields are optional for compatibility with existing records. `by_url` is the upsert index.

Normalization accepts flat Actor records and the earlier `{event, provenance}` envelope. Start timestamps must carry an explicit offset/Z; ambiguous starts are rejected. End/venue/address/coordinates can remain null; no geocoding or date invention occurs. Missing collection timestamps are labeled as import-time in extra. Sensitive extra keys are stripped and records/pages bounded. General admission availability is not inferred from a ticket link.

New rows are pending/unverified. Existing rejected decisions and curated non-Apify rows are preserved. Material changes to approved title/time/location return the record to pending. Older crawl data cannot overwrite newer data. The importer computes mapEndsAt with the existing lifecycle helper. No records publish directly to the map merely because they were scraped. A complete application moderator UI remains separate work.

URL identity is the requested deduplication key. Distinct recurring occurrences must have distinct occurrence URLs; a source reusing one URL for multiple dates needs a future occurrence-key strategy before importing those records together.

## Read events from ChatGPT or another client

`apifyRead:list` is a bounded public Convex query returning **approved public records only**. Pending imports are visible to project admins in the dashboard; they are not returned publicly. Optional source/from/to/limit filters use indexes; from is inclusive and to exclusive, limit 1–100. Use the source string actually emitted by the Actor.

```sh
npx convex run apifyRead:list '{"source":"eventbrite","from":"2026-10-25T00:00:00Z","to":"2026-11-08T00:00:00Z","limit":50}'
```

External HTTP call (no Apify token needed):

```sh
curl 'https://bold-lobster-565.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  --data '{"path":"apifyRead:list","args":{"limit":20},"format":"json"}'
```

The query is callable by an HTTP-capable client; this does not automatically install a ChatGPT connector. Sync, import, and workflow-status functions are internal/admin-only.

## Files and checks

- `convex/convex.config.ts`: workflow component and optional server secret declaration.
- `convex/apifyApi.ts`: Actor inspection, start, poll, dataset-page reads; sanitized errors.
- `convex/apifySync.ts`: durable sync and admin status query.
- `convex/apifyStore.ts`: atomic page upsert and preserved review decisions.
- `convex/apifyRead.ts`: public approved-event query and filters.
- `convex/apifyModel.ts`, `convex/schema.ts`: validators and compatible indexes.
- `shared/apifyNormalization.ts`: validation and normalization.
- `convex/apifyStore.test.ts`, `vitest.config.ts`: in-memory backend tests.
- Dependency manifests and generated Convex bindings updated; no secrets included.

Checks: `pnpm typecheck`, `pnpm test`, `pnpm test:backend`, `pnpm build`.

## Current verification

Development deployment succeeded; existing records remain compatible and the public read query returns them. All 13 lifecycle/visibility tests and 5 new backend/normalization tests pass, plus TypeScript and production build. `apifyApi:inspect` reports tokenConfigured=false in the development deployment. No paid Actor run was started and no real Actor dataset was imported. Live output compatibility, source success, and end-to-end sync remain unverified until the server token is configured. The actual Actor build's input schema was inspected publicly; its output is still not assumed to match merely because the build succeeded.
