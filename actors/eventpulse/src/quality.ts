import type { EventRecord } from './main.js';

export const categories = ['music-nightlife', 'arts-culture', 'markets-shopping', 'food-drink', 'community-causes', 'sports-outdoors', 'learning-hobbies', 'festivals-other'] as const;
export type Category = typeof categories[number];
export type QualifiedEvent = EventRecord & { latitude: number | null; longitude: number | null; categories: Category[]; tags: string[] };

export function classifyPrice(status: EventRecord['priceStatus'], text: string | null) {
    const value = text?.trim() ?? '';
    const zero = /^(?:\$\s*)?0(?:\.0+)?(?:\s*USD)?$/i.test(value);
    if (status === 'paid' && zero) return { status: 'unknown' as const, warning: 'Conflicting price evidence; manual review required' };
    if (status === 'unknown' && (zero || /^free(?:\b|$)/i.test(value))) return { status: 'free' as const, warning: null };
    return { status, warning: null };
}

// Only category labels are inferred; dates, prices, venues and coordinates are never generated.
export function classifyScenes(record: Pick<EventRecord, 'title' | 'shortDescription' | 'venue'>): Category[] {
    const text = `${record.title} ${record.shortDescription} ${record.venue ?? ''}`;
    const rules: [Category, RegExp][] = [
        ['music-nightlife', /\b(music|concert|live band|dj|dance floor|nightclub|the fillmore|the independent|bottom of the hill|the regency ballroom)\b/i],
        ['arts-culture', /\b(exhibition|gallery|museum|film screening|theater|theatre|cultural|culture)\b/i],
        ['markets-shopping', /\b(market|vendors|craft fair|flea|shopping|pop-up shop)\b/i],
        ['food-drink', /\b(food|tasting|dinner|culinary|wine|brewery)\b/i],
        ['community-causes', /\b(community|volunteer|fundraiser|mutual aid)\b/i],
        ['sports-outdoors', /\b(hike|hiking|outdoor|soccer|yoga|running club)\b/i],
        ['learning-hobbies', /\b(workshop|buildathon|hackathon|class|lecture|learn|seminar)\b/i],
        ['festivals-other', /\b(festival|block party|street fair)\b/i],
    ];
    return rules.filter(([, pattern]) => pattern.test(text)).map(([category]) => category);
}

export function numericCoordinate(value: unknown, bound: number): number | null {
    const number = typeof value === 'number' ? value : typeof value === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
    return Number.isFinite(number) && Math.abs(number) <= bound ? number : null;
}

export function timestamp(value: string | null, timezone: unknown): string | null {
    if (!value) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value);
    if (!iso) return null;
    const [, year, month, day, hour, minute, second = '00', offset] = iso;
    const wall = Date.UTC(+year!, +month! - 1, +day!, +hour!, +minute!, +second);
    const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    if (new Date(wall).toISOString().slice(0, 19) !== expected) return null;
    if (offset) return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
    if (typeof timezone !== 'string') return null;
    let formatter: Intl.DateTimeFormat;
    try {
        formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    } catch { return null; }
    const local = (ms: number) => {
        const p = Object.fromEntries(formatter.formatToParts(ms).map(part => [part.type, part.value]));
        return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
    };
    const candidates = new Set<number>();
    for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
        const probe = wall + hours * 3600000;
        const candidate = wall - (local(probe) - probe);
        if (local(candidate) === wall) candidates.add(candidate);
    }
    return candidates.size === 1 ? new Date([...candidates][0]!).toISOString() : null;
}

export function qualifyRecord(record: EventRecord, collectedAt: number, daysAhead: number): QualifiedEvent {
    const start = timestamp(record.startDateTime, record.extra.timezone);
    if (!record.title.trim() || !start) throw new Error('Missing title or unambiguous start date');
    const url = new URL(record.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsafe source URL');
    for (const key of [...url.searchParams.keys()]) {
        if (/token|secret|password|api.?key/i.test(key)) throw new Error('Credential-bearing source URL');
        if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    url.searchParams.sort();
    if (record.extra.isOnline === true) throw new Error('Online-only event');
    const parsedEnd = timestamp(record.endDateTime, record.extra.timezone);
    const end = parsedEnd && parsedEnd > start ? parsedEnd : null;
    const effectiveEnd = end ? Date.parse(end) : Date.parse(start) + 3 * 3600000;
    if (effectiveEnd <= collectedAt || Date.parse(start) >= collectedAt + daysAhead * 86400000) throw new Error('Outside requested overlap window');
    const latitude = numericCoordinate(record.extra.latitude, 90);
    const longitude = numericCoordinate(record.extra.longitude, 180);
    const price = classifyPrice(record.priceStatus, record.priceText);
    const sceneCategories = classifyScenes(record);
    const qualityWarnings: string[] = [];
    if (price.warning) qualityWarnings.push(price.warning);
    if (!sceneCategories.length) qualityWarnings.push('Scene category unresolved');
    if (!end) qualityWarnings.push('End unavailable; application uses a labeled fallback');
    const extra = Object.fromEntries(Object.entries(record.extra).filter(([key]) => !/attendee|guest|goingCount|interestedCount|spotsRemaining|hosts|email|phone/i.test(key)));
    return { ...record, url: url.href, startDateTime: start, endDateTime: end, priceStatus: price.status,
        latitude, longitude, categories: sceneCategories, tags: [],
        extra: { ...extra, latitude, longitude, categoryMethod: 'transparent keyword rules',
            coordinateSource: latitude !== null && longitude !== null ? 'original listing' : null, qualityWarnings } };
}

type GeocodeCandidate = { lat?: unknown; lon?: unknown; address?: { house_number?: string; road?: string; city?: string; town?: string } };
const roadKey = (value: string) => value.toLowerCase().replace(/\b(blvd|ave|st|rd)\.?\b/g, word => ({ blvd: 'boulevard', ave: 'avenue', st: 'street', rd: 'road' })[word] ?? word).replace(/[^a-z0-9]/g, '');
export function selectExactSfAddress(address: string, candidates: unknown[]) {
    const match = /^(\d+[a-z]?)\s+([^,]+)/i.exec(address.trim());
    if (!match) return null;
    const safeCandidates = candidates.filter((candidate): candidate is GeocodeCandidate => {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
        const a = (candidate as GeocodeCandidate).address;
        return !!a && typeof a === 'object' && typeof a.house_number === 'string' && typeof a.road === 'string'
            && (typeof a.city === 'string' || typeof a.town === 'string');
    });
    const matches = safeCandidates.filter(candidate => {
        const a = candidate.address;
        return a?.house_number?.toLowerCase() === match[1]!.toLowerCase()
            && roadKey(a.road ?? '') === roadKey(match[2]!) && (a.city ?? a.town)?.toLowerCase() === 'san francisco';
    }).map(candidate => ({ latitude: numericCoordinate(candidate.lat, 90), longitude: numericCoordinate(candidate.lon, 180) }))
        .filter((p): p is { latitude: number; longitude: number } => p.latitude !== null && p.longitude !== null
            && p.latitude >= 37.70 && p.latitude <= 37.84 && p.longitude >= -122.53 && p.longitude <= -122.35);
    if (!matches.length || matches.some(p => Math.abs(p.latitude - matches[0]!.latitude) > 0.0005 || Math.abs(p.longitude - matches[0]!.longitude) > 0.0005)) return null;
    return matches[0]!;
}
