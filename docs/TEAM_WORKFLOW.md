# Team workflow / implementation order

## Simran
- [ ] Choose frontend toolchain with team and initialize repository dependencies.
- [ ] Develop reusable EventPulse Actor with source list, schema, validation, duplicate handling, and output dataset.
- [ ] Test at least two reachable and permitted sources.
- [ ] Build server-side Claude structured flyer extraction (never publish automatically).
- [ ] Connect data ingestion to Natalie's authenticated Convex import path.
- [ ] Lead integration, preview deployment, and full demo verification.

## Natalia
- [ ] Create Figma map, event card, filter, upload and review screens.
- [ ] Implement clickable, responsive map using shared event type.
- [ ] Add date/category/free search filters and original source links.
- [ ] Implement SceneShift Lite using user-selected categories.
- [ ] Implement flyer upload, editable field review, and moderator interface.
- [ ] Polish a ten-second first impression and mobile layout.

## Natalie
- [ ] Implement Convex schema for events and moderation states.
- [ ] Expose approved events query and secure idempotent import function.
- [ ] Add storage and pending flyer submission workflow.
- [ ] Implement authorization-protected moderation approval/rejection.
- [ ] Test realtime updates in two sessions and duplicate ingestion.
- [ ] Coordinate tests, stage log, demo recording, submission checklist.

## Release gates
A. Approved events render on working map.
B. Actor outputs genuine source-backed events; imports work without duplicates.
C. Flyer -> Claude extraction -> user correction -> pending -> approval -> live pin works.
D. SceneShift filters work. Optional boosts only after A–D.

## Safety and data quality
- Never commit API keys or tokens.
- Never publish unverified flyer details immediately.
- Never claim attendance/RSVP counts without a data source.
- Do not invent geocodes; require resolution/confirmation.
- Respect publisher access rules and rate limits.
