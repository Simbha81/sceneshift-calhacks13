import { Actor, log } from 'apify';
import { CheerioCrawler } from '@crawlee/cheerio';
import * as cheerio from 'cheerio';

export interface EventRecord {
    source: string;
    title: string;
    shortDescription: string;
    startDateTime: string | null;
    endDateTime: string | null;
    venue: string | null;
    address: string | null;
    priceStatus: 'free' | 'paid' | 'unknown';
    priceText: string | null;
    url: string;
    collectedAt: string;
    extra: Record<string, unknown>;
}

interface Input {
    maxEventsPerSource?: number;
    maxEventbriteEvents?: number;
    maxPartifulEvents?: number;
    maxLumaEvents?: number;
    maxDoTheBayEvents?: number;
    daysAhead?: number;
    eventbriteCity?: string;
    lumaCity?: string;
}

const COUNTRY = 'united-states';
const now = () => new Date().toISOString();
const clip = (s: string | null | undefined, n = 300) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function priceFrom(text: string | null | undefined): EventRecord['priceStatus'] {
    if (!text) return 'unknown';
    const t = text.toLowerCase();
    if (/\bfree\b/.test(t) || /^\$?0(\.00)?$/.test(t.trim())) return 'free';
    if (/\$\s?\d/.test(t) || /\bpaid\b/.test(t)) return 'paid';
    return 'unknown';
}

// ---------- Store actor mappers ----------

function mapEventbrite(item: any): EventRecord {
    const startDate = item.start_datetime ?? (item.start_date && item.start_time ? `${item.start_date}T${item.start_time}` : item.start_date);
    const endDate = item.end_datetime ?? (item.end_date && item.end_time ? `${item.end_date}T${item.end_time}` : item.end_date);
    const free = item.ticket_availability?.is_free;
    const minPrice = item.ticket_availability?.minimum_ticket_price?.display;
    return {
        source: 'eventbrite',
        title: item.name ?? '',
        shortDescription: clip(item.summary),
        startDateTime: startDate ?? null,
        endDateTime: endDate ?? null,
        venue: item.primary_venue?.name ?? null,
        address: item.venue_address ?? item.primary_venue?.address?.localized_address_display ?? null,
        priceStatus: typeof free === 'boolean' ? (free ? 'free' : 'paid') : priceFrom(minPrice),
        priceText: minPrice ?? null,
        url: item.url ?? '',
        collectedAt: now(),
        extra: {
            timezone: item.timezone ?? null,
            isOnline: item.is_online_event ?? null,
            isSoldOut: item.ticket_availability?.is_sold_out ?? null,
            organizer: item.primary_organizer?.name ?? null,
            imageUrl: item.image_url ?? null,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
        },
    };
}

function mapPartiful(item: any): EventRecord {
    return {
        source: 'partiful',
        title: item.title ?? '',
        shortDescription: clip(item.description),
        startDateTime: item.startDate ?? null,
        endDateTime: item.endDate ?? null,
        venue: item.location ?? null,
        address: null,
        priceStatus: 'unknown',
        priceText: null,
        url: item.url ?? '',
        collectedAt: now(),
        extra: {
            timezone: item.timezone ?? null,
            city: item.city ?? null,
            goingCount: item.goingCount ?? null,
            interestedCount: item.interestedCount ?? null,
            guestCount: item.guestCount ?? null,
            coverImageUrl: item.coverImageUrl ?? null,
            hosts: item.hosts ?? [],
        },
    };
}

function mapLuma(item: any): EventRecord {
    const ev = item.event ?? {};
    const ticket = item.ticket_info ?? {};
    const geo = ev.geo_address_info ?? {};
    const priceCents = ticket.price?.cents;
    const priceText = ticket.is_free ? 'Free' : priceCents != null ? `$${(priceCents / 100).toFixed(2)}` : null;
    return {
        source: 'luma',
        title: ev.name ?? '',
        shortDescription: clip(item.description ?? ev.description ?? ''),
        startDateTime: ev.start_at ?? null,
        endDateTime: ev.end_at ?? null,
        venue: geo.address ?? geo.short_address ?? null,
        address: geo.full_address ?? null,
        priceStatus: typeof ticket.is_free === 'boolean' ? (ticket.is_free ? 'free' : 'paid') : 'unknown',
        priceText,
        url: item.event_page_url ?? (ev.url ? `https://lu.ma/${ev.url}` : ''),
        collectedAt: now(),
        extra: {
            timezone: ev.timezone ?? null,
            city: geo.city ?? null,
            guestCount: item.guest_count ?? null,
            spotsRemaining: ticket.spots_remaining ?? null,
            soldOut: ticket.is_sold_out ?? null,
            hosts: (item.hosts ?? []).map((h: any) => h.name),
            calendar: item.calendar?.name ?? null,
            latitude: ev.coordinate?.latitude ?? null,
            longitude: ev.coordinate?.longitude ?? null,
        },
    };
}

// ---------- Custom scrapers ----------

async function scrapeDoTheBay(days: number, maxEvents: number): Promise<EventRecord[]> {
    const out: EventRecord[] = [];
    const seen = new Set<string>();
    const today = new Date();
    const urls: string[] = [];
    for (let d = 0; d < days; d++) {
        const day = new Date(today.getTime() + d * 86400000);
        const y = day.getUTCFullYear();
        const m = String(day.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(day.getUTCDate()).padStart(2, '0');
        urls.push(`https://sf.dothebay.com/events/${y}/${m}/${dd}`);
    }
    const windowStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const windowEnd = new Date(windowStart.getTime() + days * 86400000);
    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: days,
        requestHandler: async ({ $, request }) => {
            $('[itemtype*="schema.org/Event"]').each((_, el) => {
                const card = $(el);
                const title = card.find('[itemprop="name"]').first().text() || card.find('.ds-listing-event-title-text').text();
                const start = card.find('meta[itemprop="startDate"]').attr('content') ?? null;
                const end = card.find('meta[itemprop="endDate"]').attr('content') ?? null;
                const venue = card.find('[itemprop="location"] [itemprop="name"]').first().text() || null;
                const street = card.find('[itemprop="streetAddress"]').attr('content') ?? card.find('[itemprop="streetAddress"]').text();
                const locality = card.find('[itemprop="addressLocality"]').attr('content') ?? card.find('[itemprop="addressLocality"]').text();
                const region = card.find('[itemprop="addressRegion"]').attr('content') ?? card.find('[itemprop="addressRegion"]').text();
                const address = [street, locality, region].map((s) => clip(s)).filter(Boolean).join(', ') || null;
                const permalink = card.attr('data-permalink') ?? card.find('a[href*="/events/"]').first().attr('href') ?? '';
                const desc = card.find('[itemprop="description"]').text();
                if (!start) return;
                const startMs = Date.parse(start.slice(0, 10));
                if (Number.isNaN(startMs) || startMs < windowStart.getTime() || startMs >= windowEnd.getTime()) return;
                if (seen.has(permalink)) return;
                if (maxEvents > 0 && out.length >= maxEvents) return;
                seen.add(permalink);
                out.push({
                    source: 'dothebay',
                    title: clip(title),
                    shortDescription: clip(desc),
                    startDateTime: start,
                    endDateTime: end,
                    venue: clip(venue) || null,
                    address,
                    priceStatus: 'unknown',
                    priceText: null,
                    url: permalink.startsWith('http') ? permalink : new URL(permalink, request.url).toString(),
                    collectedAt: now(),
                    extra: { attendeeCount: clip(card.find('.ds-listing-attendee-count').text()) || null },
                });
            });
        },
    });
    await crawler.run(urls);
    return out;
}

async function scrapeFuncheap(max: number, detailLimit: number): Promise<EventRecord[]> {
    const listing: { url: string; title: string; start: string | null; end: string | null; price: string }[] = [];
    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 1,
        requestHandler: async ({ $ }) => {
            const rows = $('tr[id^="post-"]').toArray();
            for (const row of rows) {
                if (listing.length >= max) break;
                const link = $(row).find('span.title2.entry-title a').first();
                const span = $(row).find('span.title2.entry-title').first();
                if (!link.length) continue;
                const priceCell = $(row).find('td').eq(2).text();
                listing.push({
                    url: new URL(link.attr('href') ?? '', 'https://sf.funcheap.com/').toString(),
                    title: clip(link.text()),
                    start: span.attr('data-event-date') ?? null,
                    end: span.attr('data-event-date-end') ?? null,
                    price: clip(priceCell, 60),
                });
            }
        },
    });
    await crawler.run(['https://sf.funcheap.com/']);

    const results: EventRecord[] = [];
    const detailCrawler = new CheerioCrawler({
        maxRequestsPerCrawl: detailLimit,
        requestHandler: async ({ $, request }) => {
            const base = listing.find((l) => l.url === request.url);
            const venue = clip($('div:has(> b:contains("Venue"))').first().text().replace(/^\s*Venue:\s*/i, ''));
            const address = clip($('div:has(> b:contains("Address"))').first().text().replace(/^\s*Address:\s*/i, ''));
            const costText = clip($('span.cost').first().text().replace(/^\s*Cost:\s*/i, ''), 80);
            const stats = clip($('#stats').first().text());
            const externalUrl = $('h3.url.event a').first().attr('href') ?? null;
            results.push({
                source: 'funcheap',
                title: base?.title ?? clip($('h1').first().text()),
                shortDescription: clip($('.entry-content p').first().text() || $('meta[name="description"]').attr('content')),
                startDateTime: base?.start ?? null,
                endDateTime: base?.end ?? null,
                venue: venue || null,
                address: address || null,
                priceStatus: priceFrom(costText || base?.price),
                priceText: costText || base?.price || null,
                url: request.url,
                collectedAt: now(),
                extra: { timeText: stats || null, registrationUrl: externalUrl },
            });
        },
    });
    await detailCrawler.run(listing.slice(0, detailLimit).map((l) => l.url));
    // Keep listing-only entries for events we did not fetch details for
    for (const l of listing.slice(detailLimit)) {
        results.push({
            source: 'funcheap',
            title: l.title,
            shortDescription: '',
            startDateTime: l.start,
            endDateTime: l.end,
            venue: null,
            address: null,
            priceStatus: priceFrom(l.price),
            priceText: l.price || null,
            url: l.url,
            collectedAt: now(),
            extra: {},
        });
    }
    return results;
}

// ---------- San Francisco filter ----------

const SF_PATTERN = /\b(san francisco|s\.?f\.?,?\s*ca|, ca 941\d\d|mission|soma|hayes valley|castro|haight|north beach|chinatown|marina|sunset|richmond district|bernal|dogpatch|noe valley|tenderloin|fillmore|financial district|embarcadero|japantown|potrero|excelsior|presidio|nob hill|russian hill|pacific heights|ferry building|cathedral hill|bayview)\b/i;

const NOT_SF_PATTERN = /\b(oakland|berkeley|daly city|san mateo|palo alto|san jose|sausalito|alameda|emeryville|brooklyn|new york|london|birmingham|los angeles)\b/i;

function isInSanFrancisco(r: EventRecord): boolean {
    const place = [r.address, r.venue, r.extra.city as string | null].filter(Boolean).join(' | ');
    if (!place) return false;
    if (NOT_SF_PATTERN.test(place) && !/san francisco/i.test(place)) return false;
    return SF_PATTERN.test(place);
}

// ---------- Main ----------

await Actor.init();

const input = ((await Actor.getInput<Input>()) ?? {}) as Input;
const maxPerSource = input.maxEventsPerSource ?? 5;
const maxEventbrite = input.maxEventbriteEvents ?? maxPerSource;
const maxPartiful = input.maxPartifulEvents ?? maxPerSource;
const maxLuma = input.maxLumaEvents ?? maxPerSource;
const maxDoTheBayEvents = input.maxDoTheBayEvents ?? 0;
const daysAhead = input.daysAhead ?? 7;
const eventbriteCity = input.eventbriteCity ?? 'san-francisco';
const lumaCity = input.lumaCity ?? 'sf';

const storeRun = async (actorId: string, runInput: Record<string, unknown>) => {
    const run = await Actor.call(actorId, runInput, { waitSecs: 300 });
    if (run.status !== 'SUCCEEDED') {
        log.warning(`${actorId} finished with status ${run.status}`, { runId: run.id });
        return [];
    }
    const { items } = await Actor.apifyClient.dataset(run.defaultDatasetId!).listItems();
    return items;
};

const [eventbriteItems, partifulItems, lumaItems, dothebay] = await Promise.all([
    storeRun('aitorsm/eventbrite', {
        country: COUNTRY,
        city: eventbriteCity,
        maxResults: maxEventbrite,
    }),
    storeRun('heliostech/partiful-event-scraper', {
        cities: ['sf'],
        maxEventsPerCity: maxPartiful,
        fetchEventDetails: false,
    }),
    storeRun('aitorsm/luma-events', {
        searchType: 'city',
        city: lumaCity,
        period: 'future',
        maxItems: maxLuma,
        enrichEventDetails: false,
    }),
    scrapeDoTheBay(daysAhead, maxDoTheBayEvents).catch((e) => {
        log.warning(`DoTheBay failed: ${e}`);
        return [] as EventRecord[];
    }),
]);

const records: EventRecord[] = [
    ...eventbriteItems.map(mapEventbrite),
    ...partifulItems.map(mapPartiful),
    ...lumaItems.map(mapLuma),
    ...dothebay,
].filter((r) => r.title && r.url && r.address).filter(isInSanFrancisco);

await Actor.pushData(records);
log.info(`EventPulse collected ${records.length} events`, {
    eventbrite: eventbriteItems.length,
    partiful: partifulItems.length,
    luma: lumaItems.length,
    dothebay: dothebay.length,
});

await Actor.exit();
