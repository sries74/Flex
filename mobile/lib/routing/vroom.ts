import { z } from 'zod';

/**
 * Adapter between our neutral route problem and the VROOM JSON API (ADR 0003, provisional).
 * Pure functions only: no network. Keep solver specifics in this file so the solver can be swapped.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutingStop extends LatLng {
  /** Our stop number; used as the solver job id. */
  id: number;
  serviceSec: number;
  /** Seconds since local midnight. null = unconstrained on that side. */
  windowStartSec: number | null;
  windowEndSec: number | null;
}

export interface OptimizeInput {
  depot: LatLng;
  /** When the driver leaves the depot, seconds since local midnight. */
  startTimeSec: number;
  /** Latest the driver may still be working. */
  shiftEndSec: number;
  returnToDepot: boolean;
  /** Ask the solver for an encoded route polyline. */
  geometry?: boolean;
  stops: RoutingStop[];
}

export interface VroomRequest {
  vehicles: {
    id: number;
    profile: 'car';
    start: [number, number];
    end?: [number, number];
    time_window: [number, number];
  }[];
  jobs: {
    id: number;
    location: [number, number];
    service: number;
    time_windows?: [number, number][];
  }[];
  options?: { g: true };
}

export type BuildResult = { ok: true; request: VroomRequest } | { ok: false; errors: string[] };

const validLat = (v: number) => Number.isFinite(v) && v >= -90 && v <= 90;
const validLng = (v: number) => Number.isFinite(v) && v >= -180 && v <= 180;

export function buildVroomRequest(input: OptimizeInput): BuildResult {
  const errors: string[] = [];

  if (input.stops.length === 0) errors.push('There are no stops to route.');
  if (!validLat(input.depot.lat)) errors.push('Depot latitude is invalid.');
  if (!validLng(input.depot.lng)) errors.push('Depot longitude is invalid.');
  if (!(input.shiftEndSec > input.startTimeSec)) {
    errors.push('The shift must end after it starts.');
  }

  const seen = new Set<number>();
  for (const s of input.stops) {
    const label = `Stop ${s.id}`;
    if (seen.has(s.id)) errors.push(`${label}: duplicate stop id.`);
    seen.add(s.id);
    if (!validLat(s.lat)) errors.push(`${label}: latitude is invalid.`);
    if (!validLng(s.lng)) errors.push(`${label}: longitude is invalid.`);
    if (!Number.isFinite(s.serviceSec) || s.serviceSec < 0) {
      errors.push(`${label}: service time is invalid.`);
    }
    if (s.windowStartSec !== null && s.windowEndSec !== null && s.windowEndSec < s.windowStartSec) {
      errors.push(`${label}: delivery window ends before it starts.`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const depot: [number, number] = [input.depot.lng, input.depot.lat];
  const vehicle: VroomRequest['vehicles'][number] = {
    id: 1,
    profile: 'car',
    start: depot,
    time_window: [input.startTimeSec, input.shiftEndSec],
  };
  if (input.returnToDepot) vehicle.end = depot;

  const jobs: VroomRequest['jobs'] = input.stops.map((s) => {
    const job: VroomRequest['jobs'][number] = {
      id: s.id,
      location: [s.lng, s.lat],
      service: s.serviceSec,
    };
    if (s.windowStartSec !== null || s.windowEndSec !== null) {
      job.time_windows = [
        [s.windowStartSec ?? input.startTimeSec, s.windowEndSec ?? input.shiftEndSec],
      ];
    }
    return job;
  });

  const request: VroomRequest = { vehicles: [vehicle], jobs };
  if (input.geometry) request.options = { g: true };
  return { ok: true, request };
}

export interface RouteStop {
  stopId: number;
  arrivalSec: number;
  waitSec: number;
  serviceSec: number;
  location: LatLng;
}

export interface UnassignedStop {
  stopId: number;
  location: LatLng;
}

export interface RouteSolution {
  /** Stops in the order to drive them. */
  stops: RouteStop[];
  /** Stops the solver could not fit (e.g. their window can't be met). Never silently dropped. */
  unassigned: UnassignedStop[];
  totalDurationSec: number;
  totalDistanceM: number | null;
  /** Encoded polyline, if requested and returned. */
  geometry: string | null;
  /** When the driver is back at the depot / finishes the last stop. */
  endArrivalSec: number | null;
}

export type ParseResult = { ok: true; solution: RouteSolution } | { ok: false; error: string };

const Coord = z.tuple([z.number(), z.number()]);

const Step = z.object({
  type: z.string(),
  id: z.number().optional(),
  location: Coord.optional(),
  arrival: z.number(),
  service: z.number().default(0),
  waiting_time: z.number().default(0),
});

const Response = z.object({
  code: z.number(),
  error: z.string().optional(),
  unassigned: z.array(z.object({ id: z.number(), location: Coord.optional() })).default([]),
  routes: z
    .array(
      z.object({
        duration: z.number().default(0),
        distance: z.number().optional(),
        geometry: z.string().optional(),
        steps: z.array(Step),
      }),
    )
    .default([]),
});

const toLatLng = (c: [number, number] | undefined): LatLng => ({
  lat: c ? c[1] : Number.NaN,
  lng: c ? c[0] : Number.NaN,
});

export function parseVroomResponse(raw: unknown): ParseResult {
  const parsed = Response.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'The solver response was not understood.' };

  const { code, error, unassigned, routes } = parsed.data;
  if (code !== 0) return { ok: false, error: `Solver error: ${error ?? `code ${code}`}` };

  const route = routes[0];
  const stops: RouteStop[] = [];
  let endArrivalSec: number | null = null;

  for (const step of route?.steps ?? []) {
    if (step.type === 'job' && step.id !== undefined) {
      stops.push({
        stopId: step.id,
        arrivalSec: step.arrival,
        waitSec: step.waiting_time,
        serviceSec: step.service,
        location: toLatLng(step.location),
      });
    } else if (step.type === 'end') {
      endArrivalSec = step.arrival;
    }
  }

  return {
    ok: true,
    solution: {
      stops,
      unassigned: unassigned.map((u) => ({ stopId: u.id, location: toLatLng(u.location) })),
      totalDurationSec: route?.duration ?? 0,
      totalDistanceM: route?.distance ?? null,
      geometry: route?.geometry ?? null,
      endArrivalSec,
    },
  };
}
