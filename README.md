# SceneShift — Cal Hacks 13

Help people find their place in San Francisco's local culture. SceneShift brings public event listings and moderated flyers into one live map, helping residents and SF transplants explore scenes and communities while giving independent artists, vendors, small businesses, and organizers visibility beyond their existing audiences.

## How we use Convex

Convex stores reviewed events and delivers live map updates through reactive queries.
File storage, scheduled Claude extraction and protected mutations power flyer review; workflows import listings.
See [hackathon.md](hackathon.md) for source files, commit history and evidence limits.

## Hackathon MVP and build order
1. Deployable React map reading approved Convex records, with pins, event details, source links, and live updates. Functionality before elaborate styling.
2. Custom Apify **EventPulse** Actor returning genuine, normalized, validated, deduplicated events with source attribution and collection times.
3. Complete Claude flyer-to-map: upload -> extraction -> editable review -> location resolution -> pending record -> authorized approval -> live pin.
4. Polished **SceneShift Lite** using explicit scene/category selections, without sophisticated recommendation AI.
5. Boosts only if the core is stable. Otherwise prioritize testing, demo, and documentation.

**Out of scope:** personalized public accounts, saved profiles, avatars/backgrounds, Scene Buzz, friends/DMs, advanced RSVP/reputation systems, user-created communities, and sophisticated recommendations. Secure importer/moderator authorization remains necessary.

## Figma concept versus implemented app
Natalia's Figma prototype may include simulated accounts and social interactions to show the future product vision. These interactions remain design concepts; the hackathon app implements account-free discovery, EventPulse data, Claude flyer-to-map, and SceneShift Lite. Do not build account or social backends from the mockup. Preserve direct access to working flows without login. Any concept-only controls included in the coded UI must be labeled as planned or unavailable. Demo and submission materials must identify which interactions work only in Figma.

## Sponsor targets
We aim to win every track we enter, explicitly including Claude. Meaningful product use is the priority: Apify supplies trustworthy events; Claude interprets flyers; Convex powers shared state and reactive publishing; Figma supports intentional design, prototyping, and handoff.

Read [sponsor gates and evidence](docs/SPONSOR_TRACKS.md) before treating any track as covered. Exact criteria and required evidence must be verified; package installation or coding assistance alone does not establish a strong submission.

## Ownership
The working task split:
- **Simran — Technical integration, Apify Actor quality, deployment.** `actors/`, server-side extraction integration, review pull requests.
- **Natalia — Figma and frontend:** `src/` interactive map, event cards, SceneShift Lite, uploader/review screens.
- **Natalie — Claude flyer ingestion, Convex backend and delivery:** `convex/` schema, queries, import, submission approvals, live updates; QA and track submissions.

## Shared event contract
See `src/lib/event.ts`. Keep Actor output, transport, and Convex storage consistent. Preserve original listing URLs, source identifiers, moderation status, and uncertainty. Never fabricate dates, coordinates, prices, or attendance. The Apify importer stores collectedAt and quality/provenance metadata as storage extensions to the shared core event contract.

## Development tools and API budget
Simran uses Codex; Natalie now uses Claude on her laptop and owns flyer ingestion. Claude remains the planned server-side flyer extraction API. Simran reports $50 in API credits; verify the active Console balance, restrictions/expiry, and one image request before considering access ready. A free Claude chat account and Console API access are separate. Preserve credits for the product integration and its tests.

## Starting the app
React + TypeScript + Vite, Convex, and MapLibre GL JS are implemented locally. MapLibre renders the SF map; OpenStreetMap supplies the prototype basemap. Figma supports design and handoff alongside implementation.

**Teammates: read [Start here](docs/TEAM_START_HERE.md) first.** It explains the shared database, fresh/existing checkouts, branch rules, owners, and agent instructions. PR #3 is merged; main contains the verified foundation and initial integration.

Requires Node 22.12+ and pnpm 11. For frontend/UI work, set VITE_CONVEX_URL in your local .env.local to https://bold-lobster-565.convex.cloud, then:
```sh
pnpm install --frozen-lockfile
pnpm dev
```
The shared Convex backend is already running in the cloud. UI contributors do not need a Convex login, server API tokens, or a backend watcher. Simran publishes reviewed backend changes; Natalie can test backend branches in a personal deployment without replacing shared code/data. Do not run pnpm dev:backend or npx convex dev against the shared deployment from a feature branch. Keep .env.local uncommitted; preserve existing local settings when editing it.

The map includes zoom, fit-to-events, category selection, selectable pins, event details, and source links. It reads at most 100 approved upcoming/ongoing records with valid coordinates, ordered by effective end time. Ingestion must normalize timestamps to UTC ISO strings and write `mapEndsAt` using `eventEnd(record).timestamp` in the same transaction whenever times change. Two manually reviewed market occurrences are available through the internal bootstrap. This branch adds a pending flyer workflow; backend changes still need review and publication by the shared-deployment owner.

Pins remain until the confirmed end, or an explicit estimated end. Missing/invalid ends use a clearly labeled three-hour estimate from the start; the final 30 minutes get an ending-soon symbol and amber styling. Recently sourced sold-out reports produce subdued, selectable pins instead of hiding them. Missing/stale ticket evidence stays unconfirmed. See [lifecycle rules](docs/EVENT_LIFECYCLE.md).

MapLibre 6.15.0 loads from a pinned browser CDN because package downloads were unavailable in the managed development session. The default basemap uses public OSM tiles with attribution; set the optional public `VITE_MAP_STYLE_URL` to a MapLibre style URL to change providers. Confirm the selected tile provider's usage requirements before public deployment.

```sh
pnpm typecheck
pnpm test
pnpm build
```
See [verification and remaining checks](docs/FOUNDATION_VERIFICATION.md). A production bundle is available; hosted deployment and a real-event two-browser update still need verification.

A [public hosted preview](https://sceneshift-calhacks13-preview.simbhatia81.chatgpt.site) is deployed against the development backend. Simran confirmed the hosted map works. New imported-pin rendering still needs visual confirmation. See [deployment identity, update workflow, and remaining checks](docs/HOSTED_PREVIEW.md).

To populate the development map with the first two manually reviewed market occurrences, run `npx convex dev --once` and then `npx convex run bootstrap:importReviewed '{}'`. Keep Vite open to observe the update. See [source notes and pin acceptance checks](docs/REVIEWED_EVENTS.md). This internal-only bootstrap is safe to rerun and is separate from the future Actor importer. These dated occurrences expire naturally.

## First integration milestone

EventPulse's internal sync and public approved-event read query are implemented in [the Apify integration](docs/APIFY_INTEGRATION.md). Set APIFY_TOKEN in the Convex server environment, then run the documented one-sync command. Authentication and real cloud-run ingestion are verified in development. A repeat import inserted zero duplicate records. One source-reviewed imported event is approved for the map; unresolved records remain pending. See the integration guide for run evidence and limitations.
- Deployed map reads Convex fixtures to prove the foundation; replace/augment with real sourced events for the final demo.
- EventPulse produces valid public events from two tested sources.
- Repeated import does not create duplicate events.
- Flyer upload produces editable extraction and a pending record; authorized approval creates a pin in a second browser without refresh.
- SceneShift Lite filters the map by explicit scene/category selection.

## Flyer submission and review

The flyer flow uploads the original image to Convex file storage, creates a `pending`, `verified: false` event using the shared contract in `src/lib/event.ts` with `sourceType: "flyer"`, and schedules Claude extraction. The source image storage ID and any unresolved fields remain attached to the event. Drafts stay out of `events:listApproved` and the map until an authorized reviewer approves them. Venue matches are limited to the checked local list in `convex/missionVenues.ts`; unrecognized venues use reviewer-only U.S. Census address lookup or a tap-to-place map pin. Address matches are approximate and require location confirmation before approval; street fairs can use a reviewer-selected entrance or meeting point. No geocoder API key is needed.

### Configure the Convex deployment

1. Set `ANTHROPIC_API_KEY` in Convex Deployment Settings → Environment Variables for the deployment running the app. The CLI also supports interactive entry: `npx convex env set ANTHROPIC_API_KEY`. Never put this key in `.env.local`, Vite variables, or Git.
2. Set a long random `SCENESHIFT_MODERATOR_TOKEN` in the same deployment. Reviewer actions fail closed when it is missing. This prototype uses a shared bearer token; keep it with the authorized reviewer.
3. For a personal development deployment, set the app's `VITE_CONVEX_URL` to that deployment and add both secrets there. The shared deployment belongs to Simran; coordinate and get the PR reviewed before publishing backend changes to it.
4. Check which variables are configured without printing their values with `npx convex env list --names-only`.

Convex environment variables are set per deployment. The dashboard and interactive CLI setup are documented in the [Convex environment variable guide](https://docs.convex.dev/production/environment-variables).

### Try one flyer

1. With the repo checked out on this feature branch, set `VITE_CONVEX_URL` in your local `.env.local`, then run `pnpm install --frozen-lockfile` and `pnpm dev`.
2. In **Share an event flyer**, choose one JPEG, PNG, WebP, or GIF image under 5 MB and submit it.
3. Open **Reviewer access**, enter the authorized moderator token, and load the queue. The original image, extraction status, missing fields, and editable draft appear there.
4. Correct any uncertain information. Use **Find address**, select a match, and check its pin; or zoom in and tap the map to place the pin. Confirm the event location; approve only when the required details and all uncertainty flags are resolved. Rejected events remain unpublished.
5. Check the map: only a future approved event with confirmed coordinates appears.

The sample Head West flyer supplied with the task prints “Sunday, November 1st” and “11AM” but no year. Claude should leave the date unresolved. Enter a year only after confirming it from the organizer or another reliable source.

## Collaboration
1. Clone repo on each MacBook.
2. Use owner branches such as `feature/map-ui`, `feature/convex-backend`, `feature/eventpulse`.
3. Pull latest `main` before branching; use PRs. Avoid simultaneous edits to package files, Convex schema, or shared types.
4. Each PR describes change, tests, sponsor contribution/evidence, blockers, and screenshots/demo where relevant.
5. Merge only after appropriate checks; maintain [the team workflow](docs/TEAM_WORKFLOW.md).

## Submission
Keep the repository runnable and document setup, environment variables, deployment, and actual tool use. Keep real Figma stage-log evidence, prototypes, Slides, and a demo video.

**Timing correction:** the [official Devpost overview](https://cal-hacks-13-0.devpost.com/) checked October 23 lists submission October 25, 2026 at **9:00 AM Pacific**. The project brief's Sunday-afternoon target is too late for submission. Reconfirm official announcements and sponsor-specific cutoffs.
