# First real map records

Reviewed October 23, 2026 (Pacific). These are manually researched bootstrap records, not Apify output. No scraping or Claude integration is claimed.

## Source notes

- Ferry Plaza: https://foodwise.org/markets/ferry-plaza-farmers-market/ publishes year-round Saturday hours, 8 AM–2 PM, outside the Ferry Building. October 24 is a scheduled occurrence inferred from that recurrence, not an individually confirmed dated listing.
- Clement Street: https://www.agriculturalinstitute.org/clement-st publishes Sunday hours, 9 AM–2 PM, and 244 Clement St. October 25 is similarly inferred from the recurrence.
- Both dates are in America/Los_Angeles (UTC−07:00 on these dates). Fixed UTC timestamps are stored; dates never automatically advance.
- Ferry venue coordinates 37.7953186, −122.3936029 come from the organizer's directions link at https://foodwise.org/markets/ferry-plaza-farmers-market/visitor-info/ (Google Maps place coordinates, not viewport center).
- Clement coordinates 37.7833314, −122.4618947 come from the organizer's 244 Clement St. Google Maps link (place coordinates, not viewport center).
- Prices remain unknown. `verified: false` deliberately avoids claiming individual-date confirmation. Descriptions disclose recurrence and venue-level location precision.

The source pages and linked directions were retrieved in this work session. The current event contract does not yet store retrieval timestamps or structured provenance; EventPulse ingestion must add those fields. This file retains bootstrap provenance until then.

## Load into the development deployment

From the project folder, using the already authenticated Convex CLI:

```sh
npx convex dev --once
npx convex run bootstrap:importReviewed '{}'
```

This internal mutation inserts only the two reviewed records, skips expired starts, and checks the indexed source identity before inserting. Repeating it preserves existing records and moderator decisions. It never clears a table. Do not add `--prod`; this bootstrap is intended for development verification.

## Acceptance check

Keep localhost open while loading. Before these occurrences begin, two records should appear without refresh. Select each map pin and confirm its matching title/address/source; select an event card and confirm the pin highlight. Fit events should frame both locations. Markets/food filters should retain both; music should show zero. Repeat the loader and confirm zero inserted. A second browser should observe the same records without refresh.

Status: data and loader prepared; deployment, import, and populated browser checks still require a reachable authenticated Convex session.
