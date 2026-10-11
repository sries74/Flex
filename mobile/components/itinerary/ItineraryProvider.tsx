import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Issue, Stop } from '@/lib/itinerary/itinerary';
import { createItineraryPersistence, type ItineraryPersistence } from '@/lib/itinerary/persistence';
import { defaultItineraryStore } from '@/lib/itinerary/defaultStore';
import { initialState, itineraryReducer, type ItineraryState } from '@/lib/itinerary/state';

interface ItineraryContextValue {
  state: ItineraryState;
  /** False until the saved itinerary (if any) has been read from disk. */
  hydrated: boolean;
  replace(stops: Stop[], issues: Issue[]): void;
  upsert(stop: Stop, replacesNumber?: number): void;
  remove(stopNumber: number): void;
  clear(): void;
}

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

export function ItineraryProvider({
  persistence,
  children,
}: {
  persistence?: ItineraryPersistence;
  children: ReactNode;
}) {
  const store = useMemo(
    () => persistence ?? createItineraryPersistence(defaultItineraryStore),
    [persistence],
  );
  const { status } = useAuth();
  const [state, dispatch] = useReducer(itineraryReducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const hydrating = useRef(false);
  const wipedRef = useRef(false);

  useEffect(() => {
    if (hydrating.current) return;
    hydrating.current = true;
    let cancelled = false;
    void store.load().then((saved) => {
      if (cancelled) return;
      // A sign-out that landed while we were reading must win: never resurrect wiped data.
      if (saved && !wipedRef.current) dispatch({ type: 'restore', state: saved });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
      hydrating.current = false;
    };
  }, [store]);

  // Persist every change once the saved copy has been read (otherwise we'd overwrite it with empty).
  useEffect(() => {
    if (!hydrated) return;
    if (state.stops.length === 0 && state.issues.length === 0) void store.clear();
    else void store.save(state);
  }, [state, hydrated, store]);

  // Customer addresses must not outlive the session on a shared or handed-over phone.
  useEffect(() => {
    if (status === 'signedOut') {
      wipedRef.current = true;
      dispatch({ type: 'clear' });
      void store.clear();
    }
  }, [status, store]);

  const replace = useCallback(
    (stops: Stop[], issues: Issue[]) =>
      dispatch({ type: 'replace', stops, issues, now: Date.now() }),
    [],
  );
  const upsert = useCallback(
    (stop: Stop, replacesNumber?: number) => dispatch({ type: 'upsert', stop, replacesNumber }),
    [],
  );
  const remove = useCallback((stopNumber: number) => dispatch({ type: 'remove', stopNumber }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo(
    () => ({ state, hydrated, replace, upsert, remove, clear }),
    [state, hydrated, replace, upsert, remove, clear],
  );
  return <ItineraryContext.Provider value={value}>{children}</ItineraryContext.Provider>;
}

export function useItinerary(): ItineraryContextValue {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItinerary must be used inside <ItineraryProvider>');
  return ctx;
}
