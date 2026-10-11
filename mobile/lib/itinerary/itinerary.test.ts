import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeAddress, parseOcrResponse, parseTimeOfDay } from './itinerary';

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, '../../mocks/itineraries', name), 'utf8'));

describe('parseTimeOfDay', () => {
  it.each([
    ['6:30 PM', 1110],
    ['6:30pm', 1110],
    ['6 PM', 1080],
    ['18:30', 1110],
    ['9:05', 545],
    ['12:00 AM', 0],
    ['12:30 AM', 30],
    ['12:00 PM', 720],
    ['12:30 PM', 750],
    ['  7:15 p.m. ', 1155],
    ['23:59', 1439],
  ])('parses %j as %i minutes', (input, minutes) => {
    expect(parseTimeOfDay(input)).toBe(minutes);
  });

  it.each(['', 'soon', '25:00', '9:75', '13 PM', '0 AM', '6:30:15 PM', null, undefined, 42])(
    'rejects %j',
    (input) => {
      expect(parseTimeOfDay(input)).toBeNull();
    },
  );
});

describe('normalizeAddress', () => {
  it('trims, collapses whitespace and tidies commas', () => {
    expect(normalizeAddress('  742 Evergreen Terrace ,  Springfield,  ')).toBe(
      '742 Evergreen Terrace, Springfield',
    );
  });
});

describe('parseOcrResponse', () => {
  it('normalizes a clean response and sorts by stop number', () => {
    const result = parseOcrResponse(fixture('clean.response.json'));
    expect(result).toEqual({ ok: true, ...fixture('clean.expected.json') });
  });

  it('drops unusable stops, flags the rest, and reports every problem', () => {
    const result = parseOcrResponse(fixture('messy.response.json'));
    expect(result).toEqual({ ok: true, ...fixture('messy.expected.json') });
  });

  it.each([null, undefined, 'text', 42, [], {}, { stops: 'nope' }, { stops: [{ address: 'x' }] }])(
    'rejects structurally invalid input %j',
    (input) => {
      const result = parseOcrResponse(input);
      expect(result.ok).toBe(false);
    },
  );

  it('accepts an empty stop list (nothing found) as ok with no stops', () => {
    expect(parseOcrResponse({ stops: [] })).toEqual({ ok: true, stops: [], issues: [] });
  });
});
