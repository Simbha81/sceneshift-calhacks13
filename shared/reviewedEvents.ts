import type { LocalEvent } from "../src/lib/event";

// Manual bootstrap, not Actor output. See docs/REVIEWED_EVENTS.md for provenance.
// Fixed occurrences intentionally expire; never roll dates forward to keep pins visible.
export const reviewedEvents: LocalEvent[] = [
  {
    title: "Ferry Plaza Farmers Market — Saturday",
    description: "Shop local produce and prepared foods outside the Ferry Building. This October 24 occurrence is derived from Foodwise’s published year-round Saturday schedule; check the organizer for changes. Pin marks the market venue, not a specific vendor booth.",
    startAt: "2026-10-24T15:00:00.000Z",
    endAt: "2026-10-24T21:00:00.000Z",
    timezone: "America/Los_Angeles",
    venueName: "Ferry Plaza Farmers Market",
    address: "1 Ferry Building, San Francisco, CA",
    latitude: 37.7953186,
    longitude: -122.3936029,
    categories: ["markets-shopping", "food-drink"],
    tags: ["farmers-market", "published-recurring-schedule"],
    priceType: "unknown",
    sourceType: "manual",
    sourceUrl: "https://foodwise.org/markets/ferry-plaza-farmers-market/",
    sourceEventId: "foodwise:ferry-plaza:2026-10-24",
    status: "approved",
    verified: false,
  },
  {
    title: "Clement Street Farmers Market — Sunday",
    description: "Explore produce and food vendors along Clement Street in the Inner Richmond. This October 25 occurrence is derived from AIM’s published Sunday schedule; check the organizer for changes. Pin marks the organizer-linked street address, not the entire market footprint.",
    startAt: "2026-10-25T16:00:00.000Z",
    endAt: "2026-10-25T21:00:00.000Z",
    timezone: "America/Los_Angeles",
    venueName: "Clement Street Farmers Market",
    address: "244 Clement St., San Francisco, CA 94118",
    latitude: 37.7833314,
    longitude: -122.4618947,
    categories: ["markets-shopping", "food-drink"],
    tags: ["farmers-market", "published-recurring-schedule"],
    priceType: "unknown",
    sourceType: "manual",
    sourceUrl: "https://www.agriculturalinstitute.org/clement-st",
    sourceEventId: "aim:clement:2026-10-25",
    status: "approved",
    verified: false,
  },
];
