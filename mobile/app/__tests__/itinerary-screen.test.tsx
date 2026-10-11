import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { createFakeAuthService } from '@/lib/auth/fake';
import type { AuthService } from '@/lib/auth/types';
import { pickItineraryImage } from '@/lib/ocr/pickImage';
import { getOcrProviders } from '@/lib/ocr';
import type { OcrOutcome, OcrProvider } from '@/lib/ocr/types';

let mockAuth: AuthService;

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth/errors'),
  ...jest.requireActual('@/lib/auth/validation'),
  getAuthService: () => mockAuth,
}));

jest.mock('@/lib/ocr/pickImage', () => ({ pickItineraryImage: jest.fn() }));

jest.mock('@/lib/ocr', () => ({
  ...jest.requireActual('@/lib/ocr/fallback'),
  getOcrProviders: jest.fn(),
}));

const pick = pickItineraryImage as jest.Mock;
const providers = getOcrProviders as jest.Mock;

const goodImage = {
  status: 'picked',
  result: { ok: true, image: { base64: 'AAAA', mimeType: 'image/jpeg' } },
};

function ocr(outcome: OcrOutcome): OcrProvider {
  return { name: 'fake', extract: jest.fn(async () => outcome) };
}

const scanned: OcrOutcome = {
  ok: true,
  stops: [
    {
      stopNumber: 1,
      address: '12 Example Street',
      windowStartMin: null,
      windowEndMin: 1110,
      packageCount: 2,
      needsReview: false,
    },
    {
      stopNumber: 2,
      address: '742 Evergreen Terrace',
      windowStartMin: null,
      windowEndMin: null,
      packageCount: null,
      needsReview: true,
    },
  ],
  issues: [{ stopNumber: 2, code: 'low_confidence' }],
};

async function openItinerary() {
  mockAuth = createFakeAuthService({ user: { uid: 'u1', email: 'a@b.co' } });
  await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('No stops yet');
}

beforeEach(() => {
  jest.clearAllMocks();
  providers.mockReturnValue([]);
});

describe('itinerary: scanning', () => {
  it('shows scanned stops, flags the ones to check, and explains why', async () => {
    providers.mockReturnValue([ocr(scanned)]);
    pick.mockResolvedValue(goodImage);
    await openItinerary();

    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));

    expect(await screen.findByText('12 Example Street')).toBeTruthy();
    expect(screen.getByText('Deliver by 6:30 PM · 2 pkg')).toBeTruthy();
    expect(screen.getByText('742 Evergreen Terrace')).toBeTruthy();
    expect(screen.getByText('1 stop needs a check')).toBeTruthy();
    expect(screen.getByText('This stop was hard to read. Please check it.')).toBeTruthy();
  });

  it('does nothing when the picker is cancelled', async () => {
    providers.mockReturnValue([ocr(scanned)]);
    pick.mockResolvedValue({ status: 'cancelled' });
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    await waitFor(() => expect(pick).toHaveBeenCalled());
    expect(screen.getByText('No stops yet')).toBeTruthy();
  });

  it('reports an unusable image without calling OCR', async () => {
    const provider = ocr(scanned);
    providers.mockReturnValue([provider]);
    pick.mockResolvedValue({
      status: 'picked',
      result: { ok: false, reason: 'unsupported', message: 'Use a JPEG or PNG screenshot.' },
    });
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    expect(await screen.findByText('Use a JPEG or PNG screenshot.')).toBeTruthy();
    expect(provider.extract).not.toHaveBeenCalled();
  });

  it('says so when scanning is not configured and offers manual entry', async () => {
    pick.mockResolvedValue(goodImage);
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    expect(await screen.findByText(/Scanning isn't set up in this build yet/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add stops by hand' })).toBeTruthy();
  });

  it('shows the provider failure message and lets the driver retry', async () => {
    const failing = ocr({
      ok: false,
      code: 'network',
      message: 'No connection. Check your network and try again.',
    });
    providers.mockReturnValue([failing]);
    pick.mockResolvedValue(goodImage);
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    expect(
      await screen.findByText('No connection. Check your network and try again.'),
    ).toBeTruthy();

    providers.mockReturnValue([ocr(scanned)]);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('12 Example Street')).toBeTruthy();
  });

  it('tells the driver when no stops were found', async () => {
    providers.mockReturnValue([ocr({ ok: true, stops: [], issues: [] })]);
    pick.mockResolvedValue(goodImage);
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    expect(await screen.findByText(/couldn't find any stops/)).toBeTruthy();
  });
});

describe('itinerary: editing', () => {
  async function withScan() {
    providers.mockReturnValue([ocr(scanned)]);
    pick.mockResolvedValue(goodImage);
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Scan itinerary screenshot' }));
    await screen.findByText('12 Example Street');
  }

  it('lets the driver fix a flagged stop, which clears its warning', async () => {
    await withScan();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit stop 2' }));
    await fireEvent.changeText(screen.getByLabelText('Deliver by (optional)'), '7:15 PM');
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));

    expect(await screen.findByText('Deliver by 7:15 PM')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('1 stop needs a check')).toBeNull());
  });

  it('deletes a stop', async () => {
    await withScan();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit stop 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete stop' }));
    await waitFor(() => expect(screen.queryByText('12 Example Street')).toBeNull());
    expect(screen.getByText('742 Evergreen Terrace')).toBeTruthy();
  });

  it('adds a stop with the next number', async () => {
    await withScan();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a stop' }));
    expect(screen.getByDisplayValue('3')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Address'), '9 Sample Road');
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));
    expect(await screen.findByText('9 Sample Road')).toBeTruthy();
  });

  it('asks before a new scan replaces the current stops', async () => {
    await withScan();
    await fireEvent.press(screen.getByRole('button', { name: 'Replace with a new scan' }));
    expect(await screen.findByText('Replace your stops?')).toBeTruthy();
    expect(pick).toHaveBeenCalledTimes(1); // only the first scan so far
  });

  it('clears all stops', async () => {
    await withScan();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear all stops' }));
    expect(await screen.findByText('No stops yet')).toBeTruthy();
  });
});

describe('itinerary: manual entry', () => {
  it('works with no scanning configured at all', async () => {
    await openItinerary();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a stop by hand' }));
    await fireEvent.changeText(screen.getByLabelText('Address'), '9 Sample Road');
    await fireEvent.changeText(screen.getByLabelText('Deliver by (optional)'), '5 PM');
    await fireEvent.press(screen.getByRole('button', { name: 'Save stop' }));
    expect(await screen.findByText('9 Sample Road')).toBeTruthy();
    expect(screen.getByText('Deliver by 5:00 PM')).toBeTruthy();
  });
});
