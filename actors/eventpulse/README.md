# EventPulse — trustworthy San Francisco events for SceneShift

Collect attributed public event listings for a live SF discovery map. SceneShift helps residents and newcomers explore local culture and gives organizers visibility beyond their followers.

## Release status

This repository now contains the source retrieved from owner Actor version 0.0 and a proposed 0.1 quality update. The existing live build is 0.0.13. Do not claim this update is cloud-verified until its build/run evidence is recorded below. Local source includes tests and a reproducible npm lockfile.

## Sources

- Eventbrite through the Store Actor (`aitorsm/eventbrite`): source-local times require a supplied timezone; inconsistent free/paid evidence becomes unknown with a review warning.
- Luma through `aitorsm/luma-events`: retains sourced coordinates and dates. Ticket availability is raw evidence, not a verified application claim.
- DoTheBay: custom Crawlee/Cheerio adapter, Pacific calendar days, bounded/rate-limited crawling, ongoing-event overlap, optional exact-address geocoding.
- Partiful through `heliostech/partiful-event-scraper`: optional adapter; records without a public SF address go to diagnostics. Current evidence does not establish usable Partiful coverage. Do not infer hidden locations.
- Funcheap: not supported in this release. The old implementation contained an unused/unvalidated scraper; it has been removed rather than presented as working coverage.

## Input example

```json
{"enabledSources":["eventbrite","luma","dothebay"],"maxEventbriteEvents":2,"maxLumaEvents":2,"maxDoTheBayEvents":2,"daysAhead":14,"resolveCoordinates":true,"maxGeocodeRequests":2}
```

Defaults: 5 events per source, SF city slugs, 14-day overlap window, up to 3 geocoder requests. Source caps 1–1000; DoTheBay alone retains legacy 0 meaning no event cap, bounded by days/requests. maxGeocodeRequests is 0–10. Individual source failures produce diagnostics without fabricating success. Enabled sources are explicit; [] permits an offline Actor initialization smoke check. No proxy settings are added.

## Output and uncertainty

Flat records preserve source, title, shortDescription, startDateTime/endDateTime (UTC), venue/address, priceStatus/priceText, canonical url, collectedAt, categories, tags, coordinates, and extra. Missing ends stay null; a labeled three-hour fallback is used only to decide window overlap. Invalid or ambiguous required dates are excluded with diagnostics. Repeated DST times are rejected instead of guessing. In-run deduplication uses URL + occurrence start; downstream consumers must also preserve distinct recurring occurrences when a source reuses URLs.

Categories use documented keyword rules over title, description and venue; they are classification, not new event facts. Unmatched events have an empty category list. Coordinates come from the listing, or a bounded exact house-number/road/San Francisco geocoder match. Fuzzy matches, wrong cities, ambiguous results and unavailable geocoding remain null. No city-center fallback. Preserve attribution to © OpenStreetMap contributors if using derived coordinates.

Nominatim requests identify this Actor, run sequentially at least 1.1 seconds apart, and successful lookups are cached for 30 days in sceneshift-eventpulse-geocodes. Run only one geocoding Actor at a time across this account to respect the public service's global 1 request/second limit. Disable lookup with resolveCoordinates=false when another geocoding run is active. Public service availability is not guaranteed.

DIAGNOSTICS in the run's default key-value store records source counts/errors, excluded URLs with reasons, accepted count, and geocoder request count. Output excludes guest/attendance statistics and personal attendee information. An event absent from a later crawl is never inferred cancelled. Explicit cancellation reconciliation is still a gap in these source adapters and must be added before claiming comprehensive lifecycle coverage.

## Convex handoff

This Actor only supplies data. It has no Convex credentials and never approves or publishes records. The protected importer validates/upserts records as pending and unverified, preserves provenance, and calculates mapEndsAt. Availability booleans must not become sold-out labels without explicit source evidence and the actual check time. Source quality warnings need human review.

## Development and costs

```sh
npm ci
npm test
npm run build
apify validate-schema
apify run --user-agent apify-codex-plugin/apify-actor-development
```

Put input in storage/key_value_stores/default/INPUT.json. Local data never becomes cloud run evidence. Live source tests require authenticated access for nested Store Actors and incur their fees plus compute/storage. Use small source caps and maxGeocodeRequests. A parent run budget does not guarantee a total cap on nested Actor fees. Never hardcode or log APIFY_TOKEN. The platform supplies it to the Actor.

## Evidence

Existing 0.0.13 run ieoWQtqh2UjhguSoG succeeded and produced three records imported into development Convex; repeat import inserted zero duplicates. The six-record earlier dataset exposed the issues this update addresses. See ../../docs/APIFY_INTEGRATION.md for IDs and review evidence. This 0.1 update's local/cloud validation results must be recorded separately.
