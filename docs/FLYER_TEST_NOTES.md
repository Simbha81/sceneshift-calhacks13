# Flyer extraction test notes

**Date:** 2026-10-24  
**Environment:** Personal Convex development deployment `sceneshift-flyer-demo` (`superb-dogfish-818`)
**Historical flyer:** Bassrush presents Eazybaked with rSUN at Public Works, San Francisco

This historical real-image extraction was run before the current 2026 default-year and multi-occurrence changes. It confirms the earlier single-event upload and Claude extraction path only. Do not treat it as a fresh end-to-end result for the current PR changes.

The flyer uploaded successfully, and Claude extraction completed. The submission remains `pending` and is not published to the map.

## Extracted details

| Field | Extracted value | Review note |
| --- | --- | --- |
| Title | Bassrush presents Eazybaked with rSUN | Consistent with the artist and promoter names on the flyer. |
| Description | Bassrush electronic music night featuring Eazybaked and rSUN. 21+ event. | Concise summary; age restriction is visible on the flyer. |
| Start time | 21:00 (9 PM) | Visible on the flyer. |
| Venue | Public Works | Venue name is visible. |
| Category | `music-nightlife` | Appropriate for the flyer. |
| Date | Unresolved in this historical run | Flyer says Friday, October 23, but does not print a year. The 2026 default has since been verified in a fresh personal-deployment upload below. |
| End time | Unresolved | Not shown on the flyer. |
| Street address | Unresolved | Not shown on the flyer. |
| Venue coordinates | Unresolved | Public Works is not in the current local Mission venue list; reviewer must confirm location. |

No field edits have been saved through the reviewer form yet. A reviewer still needs to check the extracted title, description, time, venue, and category, then add reliable date/address/location details if available. Keep the submission pending until that review is complete.

## Problems encountered

- The first configured Anthropic value was rejected with HTTP 401. Replacing it with a valid API key allowed the next extraction to complete. The key stays in Convex environment variables.
- Submissions that failed before the key was corrected do not retry automatically; a fresh upload was needed for this test.
- In this run, the flyer omitted the year, end time, and street address, and its venue did not match the checked local list. The current 2026 year default addresses the missing year; end time and address still need evidence or reviewer correction.
- The reviewer token is required to load and edit the queue. Do not include it or the Anthropic key in project notes or slides.

## Presentation takeaway

> Flyer upload and extraction work, but a draft still needs human review when key event details are missing. This submission stays pending until someone confirms its date and location.

## Current PR #4 checklist verification

Automated regression coverage on the local PR branch now checks:

- Claude response parsing when search text precedes structured JSON, and explicit failure for malformed or incomplete output.
- Late extraction cannot overwrite a saved correction, and edits are disabled while extraction is queued or processing.
- Review form refresh loads extracted values while preserving unsaved edits.
- End-before-start is rejected, overnight next-day times can be used, and unknown ends use the labeled three-hour estimate.
- Multi-date approval creates one distinct event record per occurrence.
- Invalid moderator credentials fail; duplicate approval is rejected.

Local verification on 2026-10-24 after the latest changes: `pnpm typecheck`, `pnpm test` (15 passed), `pnpm test:backend` (15 passed), `pnpm build`, and `git diff --check` passed.

### Fresh live extraction checks

All uploads below used the personal Convex deployment `superb-dogfish-818`, with the original image stored in Convex Storage. Claude extraction completed unless noted. These drafts remain pending; no reviewer edits or approvals were performed during the automated upload checks.

1. **Single-date flyer — Eazybaked / rSUN at Public Works.** Uploaded the user-provided flyer. Claude returned one occurrence, applied the missing year as `2026-10-23`, extracted 21:00–02:00, and found `161 Erie Street, San Francisco, CA 94103` through matching listings. `venueCoordinates` remains unresolved because Public Works is not in the checked local venue list. The event date has passed, so it was not approved for a map pin. The draft stayed pending and did not appear in `events:listApproved`. Sources include [SF Station’s matching listing](https://www.sfstation.com/eazybaked-e15772166) and [Public Works’ venue listing](https://booth.live/venues/public-works).

2. **Recurring multi-date flyer — Head West Marketplace at the Ferry Building.** The first live run returned only November 1 despite the explicit “1st Sundays, March–December” rule. This exposed a prompt gap. After tightening the recurrence instruction, a fresh upload returned two upcoming occurrences: November 1 and December 6, 2026, each at 11:00. The first end time was extracted as 17:00 from the event-specific [Golden Gate District listing](https://www.goldengate.org/events/head-west-marketplace-at-the-san-francisco-ferry-building/?F_d=11-01-2026); another listing gives 16:00, so the reviewer should confirm the end time before approval. The extracted address has a postal-code conflict: some listings say 94105, while the [Ferry Building’s own visitor page](https://www.ferrybuildingmarketplace.com/visit/) says 94111. Coordinates remain unresolved. The draft is pending and hidden from the approved-events query.

3. **Missing-detail multi-date flyer — Crawloween.** The first live run selected ZIP 94123 for Mayes Oyster House. The venue’s own [location page](https://www.mayessf.com/about) gives 94109. After tightening source-conflict instructions, a fresh upload returned four dates (October 24, October 30, October 31, and November 1, 2026), corrected the address to 1233 Polk St, San Francisco, CA 94109, and left the shared start/end time unresolved because times differ by occurrence. The official [Crawloween page](https://crawloween.com/) lists multiple check-in venues; a single shared map pin needs reviewer confirmation. Coordinates also remain unresolved. The draft is pending and hidden from the approved-events query.

### Visibility and authorization checks

- The public `events:listApproved` query did not return any of the six current test submissions while pending.
- It also did not return five existing rejected submissions in the personal database.
- A request to `flyerReview:listPending` with an intentionally incorrect moderator credential was rejected.
- Regression tests cover pending/rejected visibility and moderator authorization.

### Still required for full live end-to-end completion

- The Head West and Crawloween venues are not in the app's checked local venue list, and their locations/times have unresolved source conflicts. Keep both pending until an authorized reviewer resolves those details and the product's venue policy allows the location. Do not approve solely to force a map-pin test.
- The Crawloween test has multiple check-in locations and no single representative location; it should remain pending or be rejected after authorized review.
- The Eazybaked draft is a past event and should remain unapproved/hidden.
- Six test submissions currently remain pending in the personal database, including retry runs. After an authorized reviewer opens **Reviewer access** in the local app, reject redundant/ambiguous test drafts as appropriate. Never paste the moderator token into chat or project notes.
- The live extraction checks used Convex Storage/API directly for controlled testing. Browser-based upload, reviewer corrections, approve/reject, and map-pin verification are **not yet verified end to end**. A moderator must privately sign in and perform those checks; no reviewer token was available to this test.

The live end-to-end checklist is therefore **partially verified**, not complete: upload and extraction were exercised on real flyers, the pending/hidden and invalid-credential behavior were verified, but reviewer edits and authorized approval/rejection/map pins still need a human moderator.

The updated Convex functions were deployed only to Natalie’s personal `superb-dogfish-818` development deployment. The shared team deployment `bold-lobster-565` was not deployed or modified.
