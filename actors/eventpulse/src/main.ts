import { Actor, log } from 'apify';
import { createHash } from 'node:crypto';
import { CheerioCrawler } from '@crawlee/cheerio';
import { numericCoordinate, qualifyRecord, selectExactSfAddress, timestamp, type QualifiedEvent } from './quality.js';

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
    enabledSources?: string[];
    resolveCoordinates?: boolean;
    maxGeocodeRequests?: number;
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
            coverImageUrl: item.coverImageUrl ?? null,
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
            soldOut: ticket.is_sold_out ?? null,
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
    const local = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(today).map(p => [p.type, p.value]));
    const localDay = Date.UTC(+local.year!, +local.month! - 1, +local.day!);
    const urls: string[] = [];
    for (let d = 0; d < days; d++) {
        const day = new Date(localDay + d * 86400000);
        const y = day.getUTCFullYear();
        const m = String(day.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(day.getUTCDate()).padStart(2, '0');
        urls.push(`https://sf.dothebay.com/events/${y}/${m}/${dd}`);
    }
    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: days,
        maxConcurrency: 1,
        maxRequestsPerMinute: 30,
        respectRobotsTxtFile: true,
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
                const normalizedStart = timestamp(start, 'America/Los_Angeles');
                const normalizedEnd = timestamp(end, 'America/Los_Angeles');
                if (!normalizedStart) return;
                const effectiveEnd = normalizedEnd ? Date.parse(normalizedEnd) : Date.parse(normalizedStart) + 3 * 3600000;
                if (effectiveEnd <= today.getTime() || Date.parse(normalizedStart) >= today.getTime() + days * 86400000) return;
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
                    extra: {
                        timezone: 'America/Los_Angeles',
                        latitude: card.find('[itemprop="latitude"]').attr('content') ?? null,
                        longitude: card.find('[itemprop="longitude"]').attr('content') ?? null,
                    },
                });
            });
        },
    });
    await crawler.run(urls);
    return out;
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
const diagnostics: { sources: Record<string, { received: number; error?: string }>; accepted: number; rejected: { source: string; url: string; reason: string }[]; geocodeRequests: number } = { sources: {}, accepted: 0, rejected: [], geocodeRequests: 0 };
Actor.on('aborting', async () => { await Actor.setValue('DIAGNOSTICS', diagnostics); await Actor.exit(); });

const input = ((await Actor.getInput<Input>()) ?? {}) as Input;
const maxPerSource = input.maxEventsPerSource ?? 5;
const maxEventbrite = input.maxEventbriteEvents ?? maxPerSource;
const maxPartiful = input.maxPartifulEvents ?? maxPerSource;
const maxLuma = input.maxLumaEvents ?? maxPerSource;
const maxDoTheBayEvents = input.maxDoTheBayEvents ?? maxPerSource;
const daysAhead = input.daysAhead ?? 14;
const eventbriteCity = input.eventbriteCity ?? 'san-francisco';
const lumaCity = input.lumaCity ?? 'sf';

const enabled = new Set(input.enabledSources ?? ['eventbrite', 'partiful', 'luma', 'dothebay']);
if ([...enabled].some(source => !['eventbrite', 'partiful', 'luma', 'dothebay'].includes(source))) throw new Error('Unsupported source; Funcheap is not a validated adapter');
for (const [name, value] of Object.entries({ maxPerSource, maxEventbrite, maxPartiful, maxLuma })) {
    if (!Number.isInteger(value) || value < 1 || value > 1000) throw new Error(`${name} must be 1–1000`);
}
if (!Number.isInteger(maxDoTheBayEvents) || maxDoTheBayEvents < 0 || maxDoTheBayEvents > 1000 || !Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 90) throw new Error('Invalid source/date bounds');
const maxGeocodes = input.maxGeocodeRequests ?? 3;
if (!Number.isInteger(maxGeocodes) || maxGeocodes < 0 || maxGeocodes > 10) throw new Error('maxGeocodeRequests must be 0–10');
const storeRun = async (source: string, actorId: string, runInput: Record<string, unknown>) => {
    if (!enabled.has(source)) { diagnostics.sources[source] = { received: 0, error: 'disabled' }; return []; }
    try {
        const run = await Actor.call(actorId, runInput, { waitSecs: 300 });
        if (run.status !== 'SUCCEEDED') throw new Error('Child run unsuccessful');
        const { items } = await Actor.apifyClient.dataset(run.defaultDatasetId!).listItems({ limit: 1000 });
        diagnostics.sources[source] = { received: items.length };
        return items;
    } catch {
        diagnostics.sources[source] = { received: 0, error: 'Source Actor failed; inspect its run in Apify Console' };
        log.warning('Source Actor failed', { source });
        return [];
    }
};

const [eventbriteItems, partifulItems, lumaItems, dothebay] = await Promise.all([
    storeRun('eventbrite', 'aitorsm/eventbrite', {
        country: COUNTRY,
        city: eventbriteCity,
        maxResults: maxEventbrite,
    }),
    storeRun('partiful', 'heliostech/partiful-event-scraper', {
        cities: ['sf'],
        maxEventsPerCity: maxPartiful,
        fetchEventDetails: false,
    }),
    storeRun('luma', 'aitorsm/luma-events', {
        searchType: 'city',
        city: lumaCity,
        period: 'future',
        maxItems: maxLuma,
        enrichEventDetails: false,
    }),
    enabled.has('dothebay') ? scrapeDoTheBay(daysAhead, maxDoTheBayEvents).then(records => {
        diagnostics.sources.dothebay = { received: records.length }; return records;
    }).catch(() => {
        diagnostics.sources.dothebay = { received: 0, error: 'DoTheBay crawl failed' };
        log.warning('DoTheBay crawl failed');
        return [] as EventRecord[];
    }) : Promise.resolve([] as EventRecord[]),
]);

const records: QualifiedEvent[] = [];
const seen = new Set<string>();
for (const record of [ ...eventbriteItems.map(mapEventbrite), ...partifulItems.map(mapPartiful), ...lumaItems.map(mapLuma), ...dothebay ]) {
    try {
        if (!record.address || !isInSanFrancisco(record)) throw new Error('San Francisco address unresolved');
        const qualified = qualifyRecord(record, Date.now(), daysAhead);
        const key = `${qualified.url}|${qualified.startDateTime}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push(qualified);
    } catch (error) {
        diagnostics.rejected.push({ source: record.source, url: record.url, reason: error instanceof Error ? error.message : 'Invalid source record' });
    }
}

if (input.resolveCoordinates === true && maxGeocodes > 0 && records.some(record => record.latitude === null || record.longitude === null)) {
    const cache = await Actor.openKeyValueStore('sceneshift-eventpulse-geocodes');
    let lastRequest = 0;
    for (const record of records) {
        if (record.latitude !== null && record.longitude !== null || !record.address) continue;
        const key = `address-${createHash('sha256').update(record.address.toLowerCase()).digest('hex')}`;
        let location = await cache.getValue<{ latitude: number; longitude: number; checkedAt: string; sourceUrl: string }>(key);
        if (location && (typeof location.checkedAt !== 'string' || !Number.isFinite(Date.parse(location.checkedAt))
            || Date.parse(location.checkedAt) > Date.now() || Date.now() - Date.parse(location.checkedAt) > 30 * 86400000
            || numericCoordinate(location.latitude, 90) === null || numericCoordinate(location.longitude, 180) === null
            || location.latitude < 37.70 || location.latitude > 37.84 || location.longitude < -122.53 || location.longitude > -122.35)) location = null;
        if (!location && diagnostics.geocodeRequests < maxGeocodes) {
            const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
            if (wait) await new Promise(resolve => setTimeout(resolve, wait));
            const url = new URL('https://nominatim.openstreetmap.org/search');
            url.search = new URLSearchParams({ q: record.address, format: 'jsonv2', limit: '3', addressdetails: '1', countrycodes: 'us' }).toString();
            diagnostics.geocodeRequests++;
            lastRequest = Date.now();
            try {
                const response = await fetch(url, { headers: { 'User-Agent': 'SceneShift-EventPulse/0.1 (https://apify.com/onsra888/sceneshift-eventpulse)' }, signal: AbortSignal.timeout(10000) });
                if (!response.ok) { await response.body?.cancel(); throw new Error('Geocoder unavailable'); }
                const candidates: unknown = await response.json();
                const result = Array.isArray(candidates) ? selectExactSfAddress(record.address, candidates) : null;
                if (result) {
                    location = { ...result, checkedAt: new Date().toISOString(), sourceUrl: url.href };
                    await cache.setValue(key, location);
                }
            } catch { log.warning('Geocoding unavailable; record stays unresolved', { source: record.source }); }
        }
        if (location) {
            record.latitude = location.latitude; record.longitude = location.longitude;
            record.extra = { ...record.extra, latitude: location.latitude, longitude: location.longitude,
                coordinateSource: 'OpenStreetMap Nominatim exact house/road/city match', coordinateSourceUrl: location.sourceUrl,
                coordinateCheckedAt: location.checkedAt, coordinateAttribution: '© OpenStreetMap contributors' };
        }
    }
}
for (const record of records) {
    if (record.latitude === null || record.longitude === null) (record.extra.qualityWarnings as string[]).push('Location unresolved; review before approval');
}
diagnostics.accepted = records.length;
await Actor.setValue('DIAGNOSTICS', diagnostics);
await Actor.pushData(records);
log.info('EventPulse collection finished', { accepted: records.length, rejected: diagnostics.rejected.length, geocodeRequests: diagnostics.geocodeRequests, sources: diagnostics.sources });
await Actor.exit();
