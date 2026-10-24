# Convex Backend
Owner: Natalie.

Initialize Convex here once the frontend framework is agreed upon. Suggested modules: `schema.ts`, `events.ts`, `submissions.ts`, `flyers.ts`.

Functions: `events.listApproved`, authenticated `events.importBatch` (idempotent), `submissions.create`, authorized `submissions.approve`, `submissions.reject`; optional `events.boost`.

All map-visible events must be approved and have reliable coordinates and a valid future date.
