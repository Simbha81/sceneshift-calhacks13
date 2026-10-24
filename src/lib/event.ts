/** Shared transport contract. Convex storage may add _id and _creationTime. */
export type EventCategory =
  | 'music-nightlife' | 'arts-culture' | 'markets-shopping' | 'food-drink'
  | 'community-causes' | 'sports-outdoors' | 'learning-hobbies' | 'festivals-other';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type EventOrigin = 'apify' | 'flyer' | 'organizer' | 'manual';

export interface LocalEvent {
  title: string;
  description: string;
  startAt: string; // UTC ISO-8601; only if positively determined
  endAt?: string | null;
  timezone: string; // IANA zone
  venueName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  categories: EventCategory[];
  tags: string[];
  priceType: 'free' | 'paid' | 'unknown';
  sourceType: EventOrigin;
  sourceUrl?: string | null;
  sourceEventId?: string | null;
  status: ModerationStatus;
  verified: boolean;
}
