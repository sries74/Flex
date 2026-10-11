import type { Issue, Stop } from './itinerary';

export interface ItineraryState {
  stops: Stop[];
  issues: Issue[];
  /** When the current stops were scanned (ms since epoch); null for manual / empty. */
  scannedAt: number | null;
}

export const initialState: ItineraryState = { stops: [], issues: [], scannedAt: null };

export type ItineraryAction =
  | { type: 'replace'; stops: Stop[]; issues: Issue[]; now: number }
  | { type: 'upsert'; stop: Stop; replacesNumber?: number }
  | { type: 'remove'; stopNumber: number }
  | { type: 'restore'; state: ItineraryState }
  | { type: 'clear' };

const byNumber = (a: Stop, b: Stop) => a.stopNumber - b.stopNumber;

export function itineraryReducer(state: ItineraryState, action: ItineraryAction): ItineraryState {
  switch (action.type) {
    case 'replace':
      return {
        stops: [...action.stops].sort(byNumber),
        issues: [...action.issues],
        scannedAt: action.now,
      };
    case 'upsert': {
      const replaced = action.replacesNumber ?? action.stop.stopNumber;
      const touched = new Set([replaced, action.stop.stopNumber]);
      return {
        ...state,
        stops: [...state.stops.filter((s) => !touched.has(s.stopNumber)), action.stop].sort(
          byNumber,
        ),
        // The driver has looked at this stop, so its OCR warnings no longer apply.
        issues: state.issues.filter((i) => !touched.has(i.stopNumber)),
      };
    }
    case 'remove':
      return {
        ...state,
        stops: state.stops.filter((s) => s.stopNumber !== action.stopNumber),
        issues: state.issues.filter((i) => i.stopNumber !== action.stopNumber),
      };
    case 'restore':
      return {
        stops: [...action.state.stops].sort(byNumber),
        issues: [...action.state.issues],
        scannedAt: action.state.scannedAt,
      };
    case 'clear':
      return initialState;
  }
}

export function nextStopNumber(stops: readonly Stop[]): number {
  return stops.reduce((max, s) => Math.max(max, s.stopNumber), 0) + 1;
}

export function reviewCount(state: ItineraryState): number {
  return state.stops.filter((s) => s.needsReview).length;
}
