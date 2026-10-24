# Event visibility and ticket availability

## Time policy
- Approved upcoming and ongoing events remain visible until the end, exclusive: `now < effective end`.
- A valid `endAt` after the start takes priority. Otherwise use a valid `estimatedEndAt`; otherwise use start + three hours and label the result as estimated. This is an adjustable product heuristic, not an organizer-provided fact; do not write it into `endAt`.
- No valid start means no map pin. Times are stored as UTC ISO strings and displayed in the event's IANA time zone. Overnight and multi-day events use their actual end, without a same-day cutoff.
- After starting, the final 30 minutes show a clock symbol, amber treatment, and remaining minutes. Estimated remaining time is explicitly marked.
- The client schedules time refreshes at start, ending-soon, and end boundaries, plus a minute heartbeat. It rechecks on focus/visibility changes to account for background-tab timer throttling. Local visibility uses the same end policy as Convex.
- Ended records remain in storage; their pins disappear. No dates are automatically extended.

## Ticket policy
`availability` is independent of moderation and time. Supported values: unknown, available, sold-out. Optional fields preserve compatibility with existing records.

Only use a reported state when `availabilitySourceUrl` is HTTP(S) and `availabilityCheckedAt` records an actual source check within the past 24 hours. Missing, future, or stale evidence means availability unconfirmed. An event having no scraped ticket count is not evidence that it is sold out. General scraping/extraction of this information is not yet implemented.

Sold-out events stay on the map with a subdued dashed pin, × symbol, and explicit "Reported sold out" badge. They remain clickable so users can check source details, waitlists, or door availability. Do not infer waitlist/door tickets exist. A subsequent trustworthy available report restores normal treatment. At the event end, remove the pin regardless of availability.

## Storage and importer handoff
`mapEndsAt` is an optional derived numeric projection used by the `by_status_and_mapEndsAt` index. Every future import/edit path must set it to `eventEnd(record)?.timestamp ?? null` in the same transaction as timing changes. The read query also validates visibility; the index does not establish event authenticity.

Existing records were migrated with `bootstrap:backfillVisibility({cursor:null})`. This paginates 100 records per transaction; repeat with `continueCursor` until `isDone`. It only updates the derived projection. The current two-record development database backfilled successfully with unchanged count and event content. Do not tighten the optional validator until every writer maintains this field.

## Verification, October 24
- TypeScript, production build, whitespace check, and all 13 tests pass.
- Deployed to development bold-lobster-565; both existing records retained and indexed.
- Direct Convex queries at 20:59:59.999 UTC include Ferry Plaza; at its 21:00:00.000 UTC end it is absent. Clement remains in both results.
- Browser showed Ferry Plaza "Happening now" and a 2 PM end in details, alongside upcoming Clement Street.
- Ending-soon, estimated-end, sold-out, stale-evidence, and recovered-availability behavior are covered by deterministic tests. No real event was falsely marked sold out to stage a demo. Automated ticket-source ingestion and visual review with a real sold-out listing remain future work.
