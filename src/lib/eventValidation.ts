import { v, type Validator } from "convex/values";
import type { LocalEvent } from "./event";
const nullableString = v.optional(v.union(v.string(), v.null()));
const nullableNumber = v.optional(v.union(v.number(), v.null()));
export const eventValidator = v.object({
 title:v.string(), description:v.string(), startAt:v.string(), endAt:nullableString, timezone:v.string(),
 venueName:nullableString, address:nullableString, latitude:nullableNumber, longitude:nullableNumber,
 categories:v.array(v.union(v.literal("music-nightlife"),v.literal("arts-culture"),v.literal("markets-shopping"),v.literal("food-drink"),v.literal("community-causes"),v.literal("sports-outdoors"),v.literal("learning-hobbies"),v.literal("festivals-other"))),
 tags:v.array(v.string()), priceType:v.union(v.literal("free"),v.literal("paid"),v.literal("unknown")),
 sourceType:v.union(v.literal("apify"),v.literal("flyer"),v.literal("organizer"),v.literal("manual")),
 sourceUrl:nullableString, sourceEventId:nullableString,
 status:v.union(v.literal("pending"),v.literal("approved"),v.literal("rejected")), verified:v.boolean(),
}) satisfies Validator<LocalEvent, "required", string>;
export function isMapVisible(event: LocalEvent, now: number): boolean {
 return event.status === "approved" && Number.isFinite(Date.parse(event.startAt)) && Date.parse(event.startAt) > now
 && typeof event.latitude === "number" && Number.isFinite(event.latitude) && Math.abs(event.latitude)<=90
 && typeof event.longitude === "number" && Number.isFinite(event.longitude) && Math.abs(event.longitude)<=180;
}
