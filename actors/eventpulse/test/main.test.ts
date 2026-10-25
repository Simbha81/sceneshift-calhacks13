import { describe, expect, it } from 'vitest';
import { classifyPrice, classifyScenes, qualifyRecord, selectExactSfAddress, timestamp } from '../src/quality.js';
import type { EventRecord } from '../src/main.js';
const record: EventRecord = { source: 'example', title: 'Community Night Market', shortDescription: 'Local food vendors and live music', startDateTime: '2026-10-24T16:00:00-07:00', endDateTime: '2026-10-24T22:00:00-07:00', venue: 'Example venue', address: '1805 Geary Boulevard, San Francisco, CA', priceStatus: 'free', priceText: 'Free', url: 'https://example.org/event?utm_source=test', collectedAt: '2026-10-25T00:00:00Z', extra: { timezone: 'America/Los_Angeles', guestCount: 15, latitude: '37.78', longitude: '-122.43' } };
describe('EventPulse quality gates (synthetic fixtures only)', () => {
    it('flags zero-priced paid events instead of mislabeling them', () => {
        expect(classifyPrice('paid', '0.00 USD')).toEqual({ status: 'unknown', warning: 'Conflicting price evidence; manual review required' });
        expect(classifyPrice('unknown', '$0.00').status).toBe('free');
        expect(classifyPrice('paid', '31.05 USD').status).toBe('paid');
        expect(classifyPrice('unknown', 'From $0 to $50').status).toBe('unknown');
    });
    it('assigns transparent scene labels without a generic fallback', () => {
        expect(classifyScenes(record)).toEqual(expect.arrayContaining(['markets-shopping', 'food-drink', 'music-nightlife', 'community-causes']));
        expect(classifyScenes({ title: 'Mystery', shortDescription: '', venue: null })).toEqual([]);
    });
    it('converts source-local time and rejects DST ambiguity and impossible dates', () => {
        expect(timestamp('2026-10-25T12:00:00', 'America/Los_Angeles')).toBe('2026-10-25T19:00:00.000Z');
        expect(timestamp('2026-10-25T12:00:00', null)).toBe(null);
        for (const value of ['2026-11-01T01:30:00', '2026-03-08T02:30:00', '2026-02-30T12:00:00Z']) expect(timestamp(value, 'America/Los_Angeles')).toBe(null);
    });
    it('retains ongoing events, normalizes numeric coordinates and removes attendance data', () => {
        const value = qualifyRecord(record, Date.parse('2026-10-25T00:00:00Z'), 14);
        expect(value.startDateTime).toBe('2026-10-24T23:00:00.000Z');
        expect(value.latitude).toBe(37.78);
        expect(value.url).toBe('https://example.org/event');
        expect(value.extra).not.toHaveProperty('guestCount');
        expect(() => qualifyRecord(record, Date.parse('2026-10-25T06:00:00Z'), 14)).toThrow('Outside requested overlap window');
        expect(() => qualifyRecord({ ...record, extra: { isOnline: true } }, Date.parse('2026-10-25T00:00:00Z'), 14)).toThrow('Online-only');
    });
    it('leaves unknown ends null and uses the fallback only for window filtering', () => {
        const value = qualifyRecord({ ...record, endDateTime: null }, Date.parse('2026-10-25T00:00:00Z'), 14);
        expect(value.endDateTime).toBe(null);
        expect(value.extra.qualityWarnings).toContain('End unavailable; application uses a labeled fallback');
    });
    it('accepts only exact SF address matches; refuses wrong city, street or ambiguous geometry', () => {
        const candidate = { lat: '37.784', lon: '-122.433', address: { house_number: '1805', road: 'Geary Boulevard', city: 'San Francisco' } };
        expect(selectExactSfAddress(record.address!, [null, false, { address: { house_number: 1805 } }])).toBe(null);
        expect(selectExactSfAddress(record.address!, [candidate])).toEqual({ latitude: 37.784, longitude: -122.433 });
        expect(selectExactSfAddress(record.address!, [{ ...candidate, address: { ...candidate.address, city: 'Oakland' } }])).toBe(null);
        expect(selectExactSfAddress('1805 Other Street, San Francisco', [candidate])).toBe(null);
        expect(selectExactSfAddress(record.address!, [candidate, { ...candidate, lat: '37.79' }])).toBe(null);
    });
});
