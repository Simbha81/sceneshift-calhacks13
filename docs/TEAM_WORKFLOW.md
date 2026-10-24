# Team workflow / implementation order

Read ../AGENTS.md and SPONSOR_TRACKS.md before implementing or changing scope. Work toward a deployable, inspectable demo and meaningful contributions from Apify, Claude, Convex, and Figma.

## Build order and release gates
A. Deployable map reads approved events from Convex and displays details/source links.
B. EventPulse outputs genuine, attributed, validated events; repeated imports do not duplicate them.
C. Flyer -> real Claude extraction -> correction -> location resolution -> pending -> authorized approval -> live pin in another browser works.
D. SceneShift Lite filters work and the discovery flow is polished.
E. Boosts only after A–D are stable and submission evidence is ready. Otherwise testing, demonstration, and documentation.

Figma design supports the work throughout; elaborate styling does not block the map foundation. Public browsing requires no personalized account. Protected importer/moderator access remains required.

## Simran
- [ ] Choose frontend toolchain with team and initialize dependencies.
- [ ] Develop reusable EventPulse Actor with sources, validation, duplicate handling, collection timestamps, and documented output.
- [ ] Test two reachable, supported public sources and preserve cloud run/dataset evidence.
- [ ] Build server-side Claude structured flyer extraction; flag ambiguous/missing details.
- [ ] Connect ingestion to Natalie's authenticated Convex import path.
- [ ] Lead integration, deployment, and full demo verification.

## Natalia
- [ ] Design map, card, filter, upload, and review screens in Figma; log actual design/handoff iterations.
- [ ] Implement responsive map, details, filters, and source links.
- [ ] Implement account-free SceneShift Lite from explicit scene/category selections.
- [ ] Implement upload, editable extraction review, and moderator screens.
- [ ] Polish after the complete functional path works.

## Natalie
- [ ] Implement Convex schema, approved-events query, secure idempotent import, storage, and pending submissions.
- [ ] Implement protected approval/rejection and reliable map publication.
- [ ] Test two-session live updates, duplicate ingestion, and unauthorized approval rejection.
- [ ] Coordinate QA, sponsor requirements verification, stage log, Slides, video, and submission checklist.

## Track review before optional scope
- [ ] Confirm exact sponsor categories, rules, entry methods, and deadlines, especially Claude.
- [ ] Record actual evidence against each engineering gate in SPONSOR_TRACKS.md.
- [ ] Flag any superficial or unreliable integration and prioritize its core fix.
- [ ] Prepare Figma Slides/prototypes and the <=3-minute demo video with real stage-log notes.

## Data quality
- No API keys/tokens in commits.
- No immediate publication of unchecked flyer extraction.
- No unsupported attendance/RSVP claims.
- No invented coordinates, dates, or prices.
- Preserve source attribution and retrieval times.
- Respect publisher access rules and rate limits.

## Timing
Official Devpost checked October 23: submission October 25, 2026 at 9:00 AM Pacific. Sunday afternoon is not the submission target. Reconfirm official announcements and separate sponsor cutoffs.
