import { describe, expect, it } from 'vitest';
import type { Issue, Stop } from './itinerary';
import { initialState, itineraryReducer, nextStopNumber, reviewCount } from './state';

const stop = (n: number, over: Partial<Stop> = {}): Stop => ({
  stopNumber: n,
  address: `${n} Test Street`,
  windowStartMin: null,
  windowEndMin: null,
  packageCount: null,
  needsReview: false,
  ...over,
});

describe('itineraryReducer', () => {
  it('replace swaps in a new scan', () => {
    const issues: Issue[] = [{ stopNumber: 2, code: 'low_confidence' }];
    const s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(2, { needsReview: true })],
      issues,
      now: 1000,
    });
    expect(s).toEqual({
      stops: [stop(1), stop(2, { needsReview: true })],
      issues,
      scannedAt: 1000,
    });
  });

  it('upsert inserts in stop-number order', () => {
    let s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(3)],
      issues: [],
      now: 1,
    });
    s = itineraryReducer(s, { type: 'upsert', stop: stop(2) });
    expect(s.stops.map((x) => x.stopNumber)).toEqual([1, 2, 3]);
  });

  it('upsert with replacesNumber edits in place, including renumbering', () => {
    let s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(2)],
      issues: [],
      now: 1,
    });
    s = itineraryReducer(s, {
      type: 'upsert',
      stop: stop(5, { address: 'New Way' }),
      replacesNumber: 2,
    });
    expect(s.stops.map((x) => x.stopNumber)).toEqual([1, 5]);
    expect(s.stops[1].address).toBe('New Way');
  });

  it('editing a stop clears its issues but keeps others', () => {
    const issues: Issue[] = [
      { stopNumber: 1, code: 'unparseable_time' },
      { stopNumber: 2, code: 'low_confidence' },
    ];
    let s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(2)],
      issues,
      now: 1,
    });
    s = itineraryReducer(s, { type: 'upsert', stop: stop(1), replacesNumber: 1 });
    expect(s.issues).toEqual([{ stopNumber: 2, code: 'low_confidence' }]);
  });

  it('remove drops the stop and its issues', () => {
    let s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(2)],
      issues: [{ stopNumber: 1, code: 'missing_address' }],
      now: 1,
    });
    s = itineraryReducer(s, { type: 'remove', stopNumber: 1 });
    expect(s.stops.map((x) => x.stopNumber)).toEqual([2]);
    expect(s.issues).toEqual([]);
  });

  it('restore loads a saved state verbatim, including a null scannedAt', () => {
    const saved = { stops: [stop(1)], issues: [], scannedAt: null };
    expect(itineraryReducer(initialState, { type: 'restore', state: saved })).toEqual(saved);
  });

  it('clear resets to the initial state', () => {
    const s = itineraryReducer(
      itineraryReducer(initialState, { type: 'replace', stops: [stop(1)], issues: [], now: 5 }),
      { type: 'clear' },
    );
    expect(s).toEqual(initialState);
  });

  it('does not mutate the previous state', () => {
    const before = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1)],
      issues: [],
      now: 1,
    });
    const snapshot = JSON.stringify(before);
    itineraryReducer(before, { type: 'upsert', stop: stop(2) });
    itineraryReducer(before, { type: 'remove', stopNumber: 1 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('helpers', () => {
  it('nextStopNumber is max + 1, or 1 when empty', () => {
    expect(nextStopNumber([])).toBe(1);
    expect(nextStopNumber([stop(1), stop(7), stop(3)])).toBe(8);
  });

  it('reviewCount counts stops flagged for review', () => {
    const s = itineraryReducer(initialState, {
      type: 'replace',
      stops: [stop(1), stop(2, { needsReview: true }), stop(3, { needsReview: true })],
      issues: [],
      now: 1,
    });
    expect(reviewCount(s)).toBe(2);
  });
});
