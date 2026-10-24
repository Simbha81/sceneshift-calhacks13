# SceneShift project instructions

Read README.md, docs/TEAM_WORKFLOW.md, and docs/SPONSOR_TRACKS.md before implementation or changes to scope.

## Product and audience
Help people find their place in San Francisco's local culture, especially transplants seeking community. Help independent artists, vendors, small businesses, and organizers reach audiences beyond their existing followers.

## Locked hackathon scope
Build in this order:
1. Deployable React map reading approved Convex events.
2. Custom Apify EventPulse Actor supplying genuine, attributed, validated, deduplicated events.
3. Complete Claude flyer extraction -> editable review -> location resolution -> pending record -> authorized approval -> live map update.
4. Polished SceneShift Lite using explicit scene/category filters.
5. Boosts only after the core is stable; otherwise testing, demo, documentation.

No personalized public user accounts, saved profiles, avatars/backgrounds, friends/DMs, user-created communities, Scene Buzz, advanced reputation/RSVP systems, or sophisticated recommendation AI. Protected importer and moderator authorization is still required; this is distinct from public personalized accounts.

## Sponsor goals are project requirements
The team aims to win every track entered, explicitly including Claude. Meaningful product use is the priority. Apify, Claude, Convex, and Figma must each have a clear, demonstrable contribution. Do not treat installing a package, generating code with a tool, or mentioning a sponsor as proof that its track is covered.

Use docs/SPONSOR_TRACKS.md to distinguish official requirements, our engineering quality gates, and outstanding eligibility questions. Do not claim eligibility, competitiveness, or completion without evidence. Flag a weak contribution early and prioritize the smallest change that makes the core use meaningful before optional features.

Record actual tool use and Figma stages during the build. Never fabricate tests, user feedback, model quality, or performance numbers. Preserve source URLs, timestamps, uncertainties, and real model results.

## Implementation discipline
The repository currently contains a coordination scaffold and shared event contract, not a runnable app. Verify actual status before reporting progress. Keep shared transport, Actor output, and Convex schema consistent. Never invent coordinates, dates, prices, or attendance. Track source retrieval time and deduplication identity; resolve the timestamp gap in the current transport contract when implementing ingestion.

Keep secrets server-side and out of commits. Follow the team ownership and PR workflow. New PRs must state their scope milestone, sponsor contribution, evidence, and blockers.

## Timing
The official Devpost overview checked October 23, 2026 lists submission October 25 at 9:00 AM Pacific. Do not use Sunday afternoon as the code/submission deadline. Recheck official announcements for sponsor-specific deadlines and any changes.
