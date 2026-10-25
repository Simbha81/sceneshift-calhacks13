# EventPulse quality validation — October 24, 2026 Pacific

The complete local changes survived the disconnect, were recovered, and are now wired and tested. This supersedes the recovery-only snapshot originally in PR #5.

## Verified
- Actor build 0.1.2: fAke5l4Y8RsUTQHtG, SUCCEEDED, tag quality-candidate. Live latest remains 0.0.13 pending release review. Original version 0.0 was not overwritten.
- Final cloud run b7iWmoDKu4DojKbKv: SUCCEEDED; dataset xty4iMakyZpNJgUCM. Six real records: two each Eventbrite, Luma, DoTheBay. Diagnostics accepted 6, rejected 0, geocoder requests 0. All coordinates came from listing metadata.
- Initial final-build import workflow jd71h8daenf10506emdqtz6g4h8gy7q2: fetched 6, inserted 5, updated 1, rejected 0, no truncation. Repeat workflow jd72mabkyj133j7zgwcbybzp1h8gy115: fetched 6, inserted 0, updated 5, skipped 1, rejected 0.
- Earlier candidate 0.1.1 also passed: run lz5LjIebbAkNZDJZz, dataset 1i5E4GwHgrpOn9XX3. It was not promoted to latest.
- 30 tests pass: six Actor, eleven backend/normalization/transport/review, thirteen lifecycle/visibility. Both TypeScript builds and Vite production build pass. CLI validates input, dataset and diagnostics KVS schemas. The compiled offline smoke reaches collection completion; sandbox blocks its optional memory snapshot subprocess, so it is not cloud evidence.

## Published development data
The live approved-events query returns six current records: UNDSCVRD Night Market, Daniel Herwitt exhibition at Arcana, Jai Wolf, Julia Jacklin, Clement Street Market, SF Music Day. Actor imports remain pending until source-backed admin review; unchecked networking listings and unresolved older records stay pending.

- SF Music Day: corrected free price and reviewed categories from https://intermusicsf.org/sf-music-day/ .
- UNDSCVRD: date, free price, venue and scene labels from https://luma.com/raipa01b and https://www.undiscoveredsf.com/2026-undiscovered-sf-social-media-kit .
- Arcana exhibition: October 24 6–10 PM confirmed by organizer listing https://ra.co/events/2556307 alongside https://luma.com/gat0s5pa . A separate paid afterparty begins 9:30 PM, so price is published as unknown with admission context instead of an unqualified free claim.
- Jai Wolf: 8 PM show versus 7 PM doors confirmed by https://www.theregencyballroom.com/ and https://www.axs.com/events/1496243/jai-wolf-tickets . Alternate venue entrance addresses are explained; source coordinates retained. No end or ticket status invented.
- Julia Jacklin: ticket issuer https://www.axs.com/events/1494808/julia-jacklin-tickets confirms October 24 at 8 PM and 429 Castro St. Replaced the listing's 7 PM time through internal review; original time and correction retained. End unknown; labeled application fallback applies.

Browser rendering of these new pins still needs visual confirmation. The hosted preview subscribes to the same development database; no frontend rebuild is required for data changes.

## Remaining limits
Partiful was disabled in validation and Funcheap is unsupported. No invented coverage. Scene labels are transparent keyword classification and may remain unresolved. Exact-address geocoder matching and malformed responses are unit-tested, but external geocoder behavior is not cloud-verified; lookup is off by default and only suitable for coordinated single-run prototype use. Cancellation reconciliation and occurrence identity for downstream importers that key only by URL remain gaps. Missing from a crawl is never inferred cancellation.

The temporary internal Actor source/build/test maintenance actions are removed before handoff. Version 0.1 is a separate candidate until release approval.

## Owners
Natalie owns Claude flyer ingestion in PR #4; Natalia owns UI/Figma. Simran owns EventPulse quality, integration and shared development deployment. No flyer schema or UI feature files were changed by this work.
