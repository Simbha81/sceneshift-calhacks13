# SceneShift — Cal Hacks 13

Help people find their place in San Francisco's local culture. SceneShift brings public event listings and moderated flyers into one live map, helping residents and SF transplants explore scenes and communities while giving independent artists, vendors, small businesses, and organizers visibility beyond their existing audiences.

## Hackathon MVP and build order
1. Deployable React map reading approved Convex records, with pins, event details, source links, and live updates. Functionality before elaborate styling.
2. Custom Apify **EventPulse** Actor returning genuine, normalized, validated, deduplicated events with source attribution and collection times.
3. Complete Claude flyer-to-map: upload -> extraction -> editable review -> location resolution -> pending record -> authorized approval -> live pin.
4. Polished **SceneShift Lite** using explicit scene/category selections, without sophisticated recommendation AI.
5. Boosts only if the core is stable. Otherwise prioritize testing, demo, and documentation.

**Out of scope:** personalized public accounts, saved profiles, avatars/backgrounds, Scene Buzz, friends/DMs, advanced RSVP/reputation systems, user-created communities, and sophisticated recommendations. Secure importer/moderator authorization remains necessary.

## Sponsor targets
We aim to win every track we enter, explicitly including Claude. Meaningful product use is the priority: Apify supplies trustworthy events; Claude interprets flyers; Convex powers shared state and reactive publishing; Figma supports intentional design, prototyping, and handoff.

Read [sponsor gates and evidence](docs/SPONSOR_TRACKS.md) before treating any track as covered. Exact criteria and required evidence must be verified; package installation or coding assistance alone does not establish a strong submission.

## Ownership
The working task split:
- **Simran — Technical integration, Apify Actor, Claude extraction, deployment.** `actors/`, server-side extraction integration, review pull requests.
- **Natalia — Figma and frontend:** `src/` interactive map, event cards, SceneShift Lite, uploader/review screens.
- **Natalie — Convex backend and delivery:** `convex/` schema, queries, import, submission approvals, live updates; QA and track submissions.

## Shared event contract
See `src/lib/event.ts`. Keep Actor output, transport, and Convex storage consistent. Preserve original listing URLs, source identifiers, moderation status, and uncertainty. Never fabricate dates, coordinates, prices, or attendance. The current contract does not yet include collection timestamps; add and document that field when implementing ingestion.

## Development tools and API budget
Simran and Natalie are using Codex for development. Claude remains the planned server-side flyer extraction API. Simran reports $50 in API credits; verify the active Console balance, restrictions/expiry, and one image request before considering access ready. A free Claude chat account and Console API access are separate. Preserve credits for the product integration and its tests.

## Starting the app
React + TypeScript + Vite, Convex, and MapLibre GL JS are implemented locally. MapLibre renders the SF map; OpenStreetMap supplies the prototype basemap. Figma supports design and handoff alongside implementation.

Requires Node 22.12+ and pnpm 11:
```sh
pnpm install --frozen-lockfile
pnpm dev:backend
# In a second terminal:
pnpm dev
```
Sign in to Convex and select the team/project. Convex writes local configuration to `.env.local`; never commit it. Use individual dev deployments unless deliberately coordinating shared test data. Without `VITE_CONVEX_URL`, the app shows an empty preview.

The map includes zoom, fit-to-events, category selection, selectable pins, event details, and source links. It reads at most 100 approved upcoming/ongoing records with valid coordinates, ordered by effective end time. Ingestion must normalize timestamps to UTC ISO strings and write `mapEndsAt` using `eventEnd(record).timestamp` in the same transaction whenever times change. Two manually reviewed market occurrences are available through the internal bootstrap. General import, extraction, and protected application moderation remain unfinished.

Pins remain until the confirmed end, or an explicit estimated end. Missing/invalid ends use a clearly labeled three-hour estimate from the start; the final 30 minutes get an ending-soon symbol and amber styling. Recently sourced sold-out reports produce subdued, selectable pins instead of hiding them. Missing/stale ticket evidence stays unconfirmed. See [lifecycle rules](docs/EVENT_LIFECYCLE.md).

MapLibre 6.15.0 loads from a pinned browser CDN because package downloads were unavailable in the managed development session. The default basemap uses public OSM tiles with attribution; set the optional public `VITE_MAP_STYLE_URL` to a MapLibre style URL to change providers. Confirm the selected tile provider's usage requirements before public deployment.

```sh
pnpm typecheck
pnpm test
pnpm build
```
See [verification and remaining checks](docs/FOUNDATION_VERIFICATION.md). A production bundle is available; hosted deployment and a real-event two-browser update still need verification.

An [owner-private hosted preview](https://sceneshift-calhacks13-preview.simbhatia81.chatgpt.site) is deployed against the development backend. Hosted map behavior still needs checking after owner sign-in. See [deployment identity, update workflow, and remaining checks](docs/HOSTED_PREVIEW.md).

To populate the development map with the first two manually reviewed market occurrences, run `npx convex dev --once` and then `npx convex run bootstrap:importReviewed '{}'`. Keep Vite open to observe the update. See [source notes and pin acceptance checks](docs/REVIEWED_EVENTS.md). This internal-only bootstrap is safe to rerun and is separate from the future Actor importer. These dated occurrences expire naturally.

## First integration milestone

EventPulse's internal sync and public approved-event read query are implemented in [the Apify integration](docs/APIFY_INTEGRATION.md). Set APIFY_TOKEN in the Convex server environment, then run the documented one-sync command. Authentication/live Actor output remains to be verified; public Store visibility does not grant API run access.
- Deployed map reads Convex fixtures to prove the foundation; replace/augment with real sourced events for the final demo.
- EventPulse produces valid public events from two tested sources.
- Repeated import does not create duplicate events.
- Flyer upload produces editable extraction and a pending record; authorized approval creates a pin in a second browser without refresh.
- SceneShift Lite filters the map by explicit scene/category selection.

## Collaboration
1. Clone repo on each MacBook.
2. Use owner branches such as `feature/map-ui`, `feature/convex-backend`, `feature/eventpulse`.
3. Pull latest `main` before branching; use PRs. Avoid simultaneous edits to package files, Convex schema, or shared types.
4. Each PR describes change, tests, sponsor contribution/evidence, blockers, and screenshots/demo where relevant.
5. Merge only after appropriate checks; maintain [the team workflow](docs/TEAM_WORKFLOW.md).

## Submission
Keep the repository runnable and document setup, environment variables, deployment, and actual tool use. Keep real Figma stage-log evidence, prototypes, Slides, and a demo video.

**Timing correction:** the [official Devpost overview](https://cal-hacks-13-0.devpost.com/) checked October 23 lists submission October 25, 2026 at **9:00 AM Pacific**. The project brief's Sunday-afternoon target is too late for submission. Reconfirm official announcements and sponsor-specific cutoffs.
