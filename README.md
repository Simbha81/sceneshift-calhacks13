# SceneShift — Cal Hacks 13

Community-powered local event discovery. One interactive map populated by web listings and moderated flyer submissions; personalized with SceneShift filters.

## Hackathon MVP
1. Convex-backed live event map with clear source links and useful filtering.
2. Custom Apify **EventPulse** Actor that gathers, normalizes, and validates public events.
3. Claude flyer-to-map extraction, editable review, moderation, and realtime publishing.
4. SceneShift Lite (preset interest filters). Event boosts only after core is stable.

**Out of scope this weekend:** Scene Buzz forums, direct messages, RSVPs, user-created community governance, advanced recommendations, avatars, and full reputation system.

## Ownership
- **Simran — Technical integration, Apify Actor, Claude extraction, deployment.** `actors/`, server-side extraction integration, review pull requests.
- **Natalia — Figma and frontend:** `src/` interactive map, event cards, SceneShift, uploader/review screens.
- **Natalie — Convex backend and delivery:** `convex/` schema, queries, import, submission approvals, live updates; QA and track submissions.

## Shared event contract
See `src/lib/event.ts`. Keep fields consistent across Apify output, Convex storage, and React components. No fabricated coordinates, prices, or attendance data. Store original listing URLs, source identifiers, and moderation status.

## Starting the app
This repository is a **coordination scaffold**, not a runnable application yet. Bootstrap a React/TypeScript frontend and Convex backend in your feature branches after agreeing on tool versions. Avoid replacing the shared event contract. Add API secrets only to platform environment variables, never commits.

Suggested stack: React + TypeScript (Vite or Next.js, choose one together), Convex, map library, Claude API in server-side actions, Apify custom Actor and importer.

## First integration milestone
- A running map displays sample fixtures from Convex.
- EventPulse produces valid structured public events from 2 tested sources.
- The import is idempotent and source-attributed.
- Flyer upload produces editable extraction and a pending record; approval broadcasts a new pin.

## Collaboration
1. Clone repo on each MacBook.
2. One branch per owner: `feature/map-ui`, `feature/convex-backend`, `feature/eventpulse`.
3. Pull latest `main` before branching; use pull requests; avoid simultaneously editing `package.json`, `convex/schema.ts`, or shared types.
4. Each PR describes change, tests, blockers, and screenshots/demo if relevant.
5. Merge only after basic end-to-end checks.

## Submission evidence
Record Figma ideation/prototyping/handoff/code-generation steps, actual tools used, minutes, ratings, outputs, and friction. Maintain real usability evidence, not invented metrics.
