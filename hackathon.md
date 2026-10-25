# Hackathon log

- **Project:** SceneShift
- **Event:** Cal Hacks 13.0
- **What it does:** Maps approved San Francisco events collected from listings or extracted from uploaded flyers.
- **Live app:** https://sceneshift-calhacks13-preview.simbhatia81.chatgpt.site/ (recorded preview; public access unverified)
- **Repo:** https://github.com/Simbha81/sceneshift-calhacks13
- **Frontend:** Codex Sites (docs/HOSTED_PREVIEW.md)
- **Convex deployment:** https://bold-lobster-565.convex.cloud
- **Components:** @convex-dev/workflow (convex/convex.config.ts)
- **Convex features:** schema, indexes, queries, mutations, actions, scheduled functions, file storage, realtime useQuery
- **Auth:** Other: shared moderator bearer credential; no public account login (convex/flyerReview.ts)
- **AI models:** claude-sonnet-4-6 (convex/flyerSubmissions.ts)
- **Started:** 2026-10-24T04:23:01Z
- **Last updated:** 2026-10-25T08:30:29Z

History snapshot through 51644ed. Hosting records describe an earlier frontend snapshot; this log does not establish a completed live flyer-to-map demo.

## How we use Convex

- Discovery map, event list and selected event details update without refresh through realtime useQuery and an indexed approved-events query: src/App.tsx, convex/events.ts.
- Flyer upload preserves the original image with file storage; a mutation creates a pending draft and schedules extraction: convex/flyerSubmissions.ts.
- Flyer review uses credential-checked actions and internal mutations to save corrections, approve distinct occurrences or reject drafts; approved events enter the live map subscription: convex/flyerReview.ts, convex/flyerSubmissions.ts.
- Event discovery receives normalized listings through a durable workflow with action retries, dataset pages and URL-keyed upsert mutations: convex/apifySync.ts, convex/apifyStore.ts.
- Pending review queue uses a status index and bounded query; its screen refreshes by action polling or manually, not useQuery: convex/schema.ts, src/features/submissions/FlyerSubmission.tsx.

## Log

- 2026-10-24 54eadaf: Scaffold and event contract; README.md, src/lib/event.ts.
- 2026-10-24 64c861a: Scope and evidence rules; AGENTS.md, docs/SPONSOR_TRACKS.md.
- 2026-10-24 c2e7fb6: React map and reactive query; src/App.tsx, convex/events.ts, convex/schema.ts.
- 2026-10-24 b087c2c: Reviewed-event bootstrap; convex/bootstrap.ts, shared/reviewedEvents.ts.
- 2026-10-24 0908664: Duplicate and two-client checks; scripts/verify-live.mjs, convex/bootstrap.ts.
- 2026-10-24 dd56698: End-time visibility and ticket states; src/lib/eventLifecycle.ts, convex/events.ts.
- 2026-10-24 cef2ce7: Hosting handoff; docs/HOSTED_PREVIEW.md, README.md.
- 2026-10-24 feb74be: Merge map foundation (#2); src/App.tsx, convex/schema.ts.
- 2026-10-25 2c8d936: Durable Actor ingestion (#3); convex/apifySync.ts, convex/apifyStore.ts, convex/convex.config.ts.
- 2026-10-25 393b263: Data quality and reviewed corrections (#5); convex/apifyReview.ts, shared/apifyNormalization.ts.
- 2026-10-25 dd043ee: Release evidence (#6); docs/EVENTPULSE_QUALITY_CHECKPOINT.md.
- 2026-10-25 1a99450: Claude flyer workflow (#4); convex/flyerSubmissions.ts, convex/flyerReview.ts, src/features/submissions/FlyerSubmission.tsx.
- 2026-10-25 51644ed: Distinguish Figma concepts from working scope (#7); AGENTS.md, docs/TEAM_WORKFLOW.md.
