# Flyer extraction test notes

**Date:** 2026-10-24  
**Environment:** Personal Convex development deployment `sceneshift-flyer-demo` (`superb-dogfish-818`)
**Flyer:** Bassrush presents Eazybaked with rSUN at Public Works, San Francisco

This real-image extraction was run before the latest 2026 default-year and multi-occurrence changes. It confirms the earlier single-event upload and Claude extraction path only; the current prompt and multi-date flow still need a fresh real-flyer check.

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

The test used the personal demo deployment only. No Convex changes were deployed to the shared team backend. The grouped multi-date implementation and latest extraction prompt have not yet been deployed or exercised against a new flyer.
