# EventPulse quality work — recovery checkpoint

## State
The execution environment became unavailable on October 25 UTC while this work was in progress. This draft preserves authenticated source recovered from Actor version 0.0 and the quality helpers/tests reconstructed from the session. It is not a completed quality release and must not be merged as one.

Main remains the verified PR #3 baseline (commit 2c8d9363034849462e8ccf547a30e4954186a75f). No new Actor build was published. The live Actor's last verified build is 0.0.13. The source snapshot's main.ts is the retrieved baseline; src/quality.ts is intentionally not wired into that main on this recovery branch yet.

## Confirmed findings
- Eventbrite maps a false is_free flag plus 0.00 USD to paid. Conflicting evidence should become unknown with a review warning; organizer-backed correction is separate.
- DoTheBay output lacks usable coordinates.
- Source output has no scene categories.
- The old Funcheap function is never invoked; it is not proven coverage.
- Partiful records without public addresses are filtered; do not infer hidden locations.
- Existing source mappers include attendance fields; final qualified output should remove them.

## Work performed locally before disconnection
- Actor quality module and six synthetic tests passed, and Actor TypeScript build passed.
- Candidate main wiring used qualifyRecord, UTC normalization with explicit zones, overlap filtering, category labels, and URL/occurrence deduplication.
- DoTheBay crawl used Pacific calendar dates, maxConcurrency 1, 30 requests/minute, robots checking and early ongoing-event filtering.
- Added bounded optional Nominatim lookup: exact house/road/city only, SF bounds, ambiguous results stay unresolved, <=1 request per 1.1 seconds, successful lookups cached 30 days in named storage. Added enabledSources, resolveCoordinates and maxGeocodeRequests inputs. New geocoding has not been cloud-tested.
- Candidate metadata used version 0.1, buildTag quality-candidate, generatedBy Codex, meaningful title, expanded dataset schema and diagnostics KVS schema.
- Apify CLI reported input, dataset and KVS schemas valid. A compiled local smoke run with enabledSources=[] reached collection completion with zero results. CLI final exit was not verified; the environment blocked a memory snapshot subprocess and later timed out. This is not a real-source/cloud run.
- Root backend TypeScript and ten tests passed: stricter offset-bearing calendar-date rejection plus internal source-backed review corrections for price/category/description; warnings other than price remain blocking, aliases stay synchronized and reviews carry evidence.
- A development deploy was in flight when environment access disappeared. Its completion and published function version are unknown. No source-backed live correction was confirmed, so SF Music Day must not be described as newly corrected/published.

## Recovery limitations
The full final local source tree, npm lockfile, candidate main/schema edits and backend edits were not readable after disconnect. They may remain on the user's Mac. Retrieve those files before reconstructing or overwriting them. The helper/test source here was recovered from the session and has not been rerun in this GitHub snapshot. Original Actor source files and existing template configuration are included for continuity, not proof of release quality.

## Resume order
1. Reconnect /Users/sim/Documents/ChatGPT/Calhack 13.0/sceneshift-calhacks13 and inspect its existing changes; preserve them. Fetch current main and teammates' branches before editing.
2. Inspect development bold-lobster-565 function state. Remove temporary internal convex/apifyMaintenance.ts (read-only Actor source recovery) and regenerate API bindings; deletion had not completed when the environment closed.
3. Recover full candidate Actor changes and package-lock.json from disk. Otherwise wire the qualified helpers into main, add bounded geocoding and inputs/diagnostics, and regenerate a dependency lockfile. This recovery snapshot still has original source dependency ranges.
4. Run Actor tests/build/schema validation and the root suite. Test exact address responses robustly against malformed provider data, enforce request bounds and cache validation, and verify no attendee data reaches output.
5. Follow actors/eventpulse/AGENTS.md: deployment requires confirmation. Build/test a separate candidate before moving latest; do not claim a cloud result until a real new run and dataset are checked.
6. Apply source-backed price/category corrections through the protected admin path, then verify the hosted pins. Evidence: https://intermusicsf.org/sf-music-day/ confirms free admission, October 25 noon–6 PM. https://www.undiscoveredsf.com/2026-undiscovered-sf-social-media-kit confirms October 24 4–10 PM, free, 330 Ritch St.
7. Keep uncertain coordinates/prices pending. Record actual source coverage and successful runs; no unverified Funcheap or Partiful claims.

## Current owners
Natalie owns Claude flyer ingestion on her laptop/branch. Natalia owns UI/Figma. Simran owns EventPulse quality, integration, review, and shared deployment. Do not overlap their feature files. The shared application contract is src/lib/event.ts; flyer records use sourceType flyer, pending and unverified. The shared backend remains bold-lobster-565; teammates' UI uses its public VITE_CONVEX_URL and pnpm dev only.
