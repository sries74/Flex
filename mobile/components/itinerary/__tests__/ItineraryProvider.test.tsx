import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { AuthProvider } from '@/components/auth/AuthProvider';
import type { Stop } from '@/lib/itinerary/itinerary';
import { createItineraryPersistence, type SimpleKeyValueStore } from '@/lib/itinerary/persistence';
import { createFakeAuthService } from '@/lib/auth/fake';
import { ItineraryProvider, useItinerary } from '../ItineraryProvider';

const stop: Stop = {
  stopNumber: 1,
  address: '12 Example Street',
  windowStartMin: null,
  windowEndMin: 1110,
  packageCount: null,
  needsReview: false,
};

function memoryStore(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}));
  const store: SimpleKeyValueStore & { data: Map<string, string> } = {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return store;
}

const holder: { current?: ReturnType<typeof useItinerary> } = {};
const api = () => holder.current as ReturnType<typeof useItinerary>;

function Probe() {
  const ctx = useItinerary();
  useEffect(() => {
    holder.current = ctx;
  });
  const view = ctx;
  return (
    <Text>{`${view.hydrated ? 'ready' : 'loading'}:${view.state.stops.map((s) => s.address).join('|')}`}</Text>
  );
}

async function mount(store: SimpleKeyValueStore, user = { uid: 'u', email: 'a@b.co' }) {
  const auth = createFakeAuthService({ user });
  await render(
    <AuthProvider service={auth}>
      <ItineraryProvider persistence={createItineraryPersistence(store)}>
        <Probe />
      </ItineraryProvider>
    </AuthProvider>,
  );
  return auth;
}

describe('ItineraryProvider', () => {
  it('starts empty once hydration finishes', async () => {
    await mount(memoryStore());
    expect(await screen.findByText('ready:')).toBeTruthy();
  });

  it('saves changes to storage', async () => {
    const store = memoryStore();
    await mount(store);
    await screen.findByText('ready:');
    await act(async () => api().replace([stop], []));
    await waitFor(() => expect(store.data.get('itinerary.v1')).toContain('12 Example Street'));
  });

  it('restores a saved itinerary on launch', async () => {
    const store = memoryStore();
    await createItineraryPersistence(store).save({ stops: [stop], issues: [], scannedAt: null });
    await mount(store);
    expect(await screen.findByText('ready:12 Example Street')).toBeTruthy();
  });

  it('wipes stored addresses when the user signs out', async () => {
    const store = memoryStore();
    const auth = await mount(store);
    await screen.findByText('ready:');
    await act(async () => api().replace([stop], []));
    await waitFor(() => expect(store.data.size).toBe(1));

    await act(async () => auth.signOut());
    await waitFor(() => expect(store.data.size).toBe(0));
    expect(await screen.findByText('ready:')).toBeTruthy();
  });

  it('does not resurrect wiped data when sign-out races a slow disk read', async () => {
    const slow = memoryStore();
    await createItineraryPersistence(slow).save({ stops: [stop], issues: [], scannedAt: null });
    const realGet = slow.getItem;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    slow.getItem = async (k) => {
      await gate;
      return realGet(k);
    };

    // Signed out from the start: status flips to signedOut while the read is still pending.
    await mount(slow, null as never);
    await act(async () => release());
    expect(await screen.findByText('ready:')).toBeTruthy();
  });

  it('useItinerary throws outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('useItinerary must be used inside');
    spy.mockRestore();
  });
});
