# Flyer extraction test notes

**Date:** 2026-10-24  
**Environment:** Personal Convex development deployment `sceneshift-flyer-demo` (`superb-dogfish-818`)
**Flyer:** Bassrush presents Eazybaked with rSUN at Public Works, San Francisco

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
| Date | Unresolved in this run | Flyer says Friday, October 23, but does not print a year. The current implementation now defaults a printed month/day with no year to 2026 and fills the date field; that change has not yet been checked with a new real upload. |
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
- End-before-start is rejected, overnight end times can use the following date, and an unknown end time remains blank with the three-hour estimate labeled.
- Invalid moderator credentials fail; duplicate approval is rejected.

Local verification on 2026-10-24: `pnpm typecheck`, `pnpm test` (15 passed), `pnpm test:backend` (14 passed), `pnpm build`, and `git diff --check` passed.

Fresh live end-to-end verification for this PR revision is still pending on the personal deployment. In particular, single-date, multi-date, and missing-details uploads, reviewer corrections/approval, map pins, and pending/rejected visibility have not been re-run after these changes. Do not deploy this feature branch to the shared team backend. Record each live run here only after it is actually completed.

The prior test used the personal demo deployment only. No Convex changes were deployed to the shared team backend.
