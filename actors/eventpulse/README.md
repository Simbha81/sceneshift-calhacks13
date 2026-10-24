# EventPulse — Apify Actor

Owner: Simran.

## Inputs (proposed)
- `sources`: tested public event listing URLs / source identifiers
- `location`: region label (e.g., San Francisco Bay Area)
- `startDate`, `endDate`: local ISO dates
- `maxEvents`: collection cap

## Output
Emit normalized event objects conforming to `src/lib/event.ts`; include stable source URL/ID and extraction diagnostics, and exclude events with unresolvable required date fields. Keep source attribution. Do not assert that an extracted event is organizer-verified.

## Definition of done
Cloud Actor run succeeds against two different supported sources and yields documented, validated dataset records that the backend importer accepts.
