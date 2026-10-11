import { describe, expect, it } from 'vitest';
import type { Stop } from '../itinerary/itinerary';
import { matchLabel } from './matchLabel';

const stop = (stopNumber: number, address: string): Stop => ({
  stopNumber,
  address,
  windowStartMin: null,
  windowEndMin: null,
  packageCount: null,
  needsReview: false,
});

const stops: Stop[] = [
  stop(1, '12 Example Street Apt 4B'),
  stop(2, '742 Evergreen Terrace, Springfield'),
  stop(3, '744 Evergreen Terrace, Springfield'),
  stop(4, '9 Sample Road'),
  stop(5, '12 Example Street Apt 5A'),
];

function matchedNumber(text: string, list: Stop[] = stops): number | 'ambiguous' | 'none' {
  const r = matchLabel(text, list);
  if (r.kind === 'match') return r.stop.stopNumber;
  return r.kind;
}

describe('matchLabel', () => {
  it('matches an exact address', () => {
    expect(matchedNumber('9 Sample Road')).toBe(4);
  });

  it('ignores extra label lines such as recipient, city and zip', () => {
    expect(matchedNumber('JANE EXAMPLE\n9 SAMPLE RD\nSPRINGFIELD ST 12345')).toBe(4);
  });

  it('is case-, punctuation- and abbreviation-insensitive', () => {
    expect(matchedNumber('742 EVERGREEN TER.')).toBe(2);
    expect(matchedNumber('9 sample rd,')).toBe(4);
  });

  it('tolerates OCR typos in street names', () => {
    expect(matchedNumber('742 Evergren Terrace')).toBe(2);
  });

  it('tolerates letters misread inside house numbers', () => {
    expect(matchedNumber('1O Example Street Apt 4B', [stop(1, '10 Example Street Apt 4B')])).toBe(
      1,
    );
  });

  it('distinguishes neighbouring house numbers on the same street', () => {
    expect(matchedNumber('744 Evergreen Terrace')).toBe(3);
    expect(matchedNumber('742 Evergreen Terrace')).toBe(2);
  });

  it('never auto-matches a house number that is not on the itinerary', () => {
    expect(matchLabel('999 Evergreen Terrace', stops).kind).not.toBe('match');
  });

  it('uses the unit to choose between stops at the same building', () => {
    expect(matchedNumber('12 Example St #5A')).toBe(5);
    expect(matchedNumber('12 Example St Unit 4B')).toBe(1);
  });

  it('reports ambiguity instead of guessing when two stops share an address', () => {
    const dup = [stop(3, '55 Twin Way'), stop(7, '55 Twin Way')];
    const r = matchLabel('55 Twin Way', dup);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.candidates.map((c) => c.stop.stopNumber).sort()).toEqual([3, 7]);
    }
  });

  it('lets an explicit "Stop N" on the label break an address tie', () => {
    const dup = [stop(3, '55 Twin Way'), stop(7, '55 Twin Way')];
    expect(matchedNumber('STOP 7\n55 Twin Way', dup)).toBe(7);
  });

  it('returns none for unrelated or empty text', () => {
    expect(matchedNumber('Fragile - handle with care')).toBe('none');
    expect(matchedNumber('')).toBe('none');
    expect(matchedNumber('   \n  ')).toBe('none');
  });

  it('returns none when there are no stops', () => {
    expect(matchedNumber('9 Sample Road', [])).toBe('none');
  });

  it("matches every stop's own address text back to that stop", () => {
    for (const s of stops) expect(matchedNumber(s.address)).toBe(s.stopNumber);
  });

  it('does not confuse house numbers that merely contain one another', () => {
    const list = [stop(1, '14 Main Street'), stop(2, '41 Main Street'), stop(3, '144 Main Street')];
    expect(matchedNumber('14 Main St', list)).toBe(1);
    expect(matchedNumber('41 Main St', list)).toBe(2);
    expect(matchedNumber('144 Main St', list)).toBe(3);
  });
});
