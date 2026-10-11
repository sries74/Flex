import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildVroomRequest, parseVroomResponse, type OptimizeInput } from './vroom';

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, '../../mocks/routing', name), 'utf8'));

const input: OptimizeInput = {
  depot: { lat: 37.78, lng: -122.4 },
  startTimeSec: 9 * 3600,
  shiftEndSec: 18 * 3600,
  returnToDepot: true,
  stops: [
    {
      id: 1,
      lat: 37.8,
      lng: -122.42,
      serviceSec: 300,
      windowStartSec: null,
      windowEndSec: 17 * 3600,
    },
    {
      id: 2,
      lat: 37.81,
      lng: -122.43,
      serviceSec: 300,
      windowStartSec: 10 * 3600,
      windowEndSec: null,
    },
    { id: 3, lat: 37.79, lng: -122.41, serviceSec: 300, windowStartSec: null, windowEndSec: null },
  ],
};

describe('buildVroomRequest', () => {
  it('builds one vehicle and one job per stop with [lng, lat] coordinates', () => {
    const r = buildVroomRequest(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.vehicles).toEqual([
      {
        id: 1,
        profile: 'car',
        start: [-122.4, 37.78],
        end: [-122.4, 37.78],
        time_window: [32400, 64800],
      },
    ]);
    expect(r.request.jobs[0]).toEqual({
      id: 1,
      location: [-122.42, 37.8],
      service: 300,
      time_windows: [[32400, 61200]],
    });
  });

  it('fills the open side of a one-sided window from the shift bounds', () => {
    const r = buildVroomRequest(input);
    if (!r.ok) throw new Error('expected ok');
    expect(r.request.jobs[1].time_windows).toEqual([[36000, 64800]]);
  });

  it('omits time_windows for unconstrained stops', () => {
    const r = buildVroomRequest(input);
    if (!r.ok) throw new Error('expected ok');
    expect(r.request.jobs[2]).not.toHaveProperty('time_windows');
  });

  it('omits the end location when not returning to the depot', () => {
    const r = buildVroomRequest({ ...input, returnToDepot: false });
    if (!r.ok) throw new Error('expected ok');
    expect(r.request.vehicles[0]).not.toHaveProperty('end');
  });

  it('requests geometry only when asked', () => {
    const plain = buildVroomRequest(input);
    const geo = buildVroomRequest({ ...input, geometry: true });
    if (!plain.ok || !geo.ok) throw new Error('expected ok');
    expect(plain.request).not.toHaveProperty('options');
    expect(geo.request.options).toEqual({ g: true });
  });

  it.each([
    ['latitude out of range', { stops: [{ ...input.stops[0], lat: 91 }] }, /latitude/i],
    ['longitude out of range', { stops: [{ ...input.stops[0], lng: -181 }] }, /longitude/i],
    ['NaN coordinate', { stops: [{ ...input.stops[0], lat: Number.NaN }] }, /latitude/i],
    [
      'inverted window',
      { stops: [{ ...input.stops[0], windowStartSec: 5000, windowEndSec: 4000 }] },
      /window/i,
    ],
    ['duplicate ids', { stops: [input.stops[0], input.stops[0]] }, /duplicate/i],
    ['negative service time', { stops: [{ ...input.stops[0], serviceSec: -1 }] }, /service/i],
    ['shift ends before it starts', { shiftEndSec: 100 }, /shift/i],
    ['no stops', { stops: [] }, /no stops/i],
  ])('rejects %s', (_name, patch, message) => {
    const r = buildVroomRequest({ ...input, ...patch } as OptimizeInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(message);
  });
});

describe('parseVroomResponse', () => {
  it('returns stops in route order with arrival and wait times', () => {
    const r = parseVroomResponse(fixture('vroom-ok.response.json'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.solution.stops.map((s) => s.stopId)).toEqual([3, 1, 2]);
    expect(r.solution.stops[1]).toEqual({
      stopId: 1,
      arrivalSec: 33600,
      waitSec: 600,
      serviceSec: 300,
      location: { lat: 37.8, lng: -122.42 },
    });
    expect(r.solution.unassigned).toEqual([]);
    expect(r.solution.totalDurationSec).toBe(2400);
    expect(r.solution.totalDistanceM).toBe(18250);
    expect(r.solution.geometry).toBe('_p~iF~ps|U_ulLnnqC');
    expect(r.solution.endArrivalSec).toBe(35100);
  });

  it('reports stops the solver could not fit instead of dropping them silently', () => {
    const r = parseVroomResponse(fixture('vroom-unassigned.response.json'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.solution.stops.map((s) => s.stopId)).toEqual([1]);
    expect(r.solution.unassigned).toEqual([{ stopId: 2, location: { lat: 37.81, lng: -122.43 } }]);
  });

  it('returns null distance and geometry when absent', () => {
    const r = parseVroomResponse(fixture('vroom-unassigned.response.json'));
    if (!r.ok) throw new Error('expected ok');
    expect(r.solution.totalDistanceM).toBeNull();
    expect(r.solution.geometry).toBeNull();
  });

  it('treats a response with no routes as everything unassigned', () => {
    const r = parseVroomResponse({
      code: 0,
      summary: { unassigned: 1 },
      unassigned: [{ id: 9, location: [1, 2] }],
      routes: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.solution.stops).toEqual([]);
      expect(r.solution.unassigned.map((u) => u.stopId)).toEqual([9]);
    }
  });

  it.each([
    [null],
    ['x'],
    [{}],
    [{ code: 3, error: 'Invalid input' }],
    [{ code: 0, routes: 'nope', unassigned: [] }],
  ])('rejects malformed or error responses: %j', (input) => {
    expect(parseVroomResponse(input).ok).toBe(false);
  });

  it('surfaces the solver error message for non-zero codes', () => {
    const r = parseVroomResponse({ code: 3, error: 'Invalid location' });
    expect(r).toEqual({ ok: false, error: 'Solver error: Invalid location' });
  });
});
