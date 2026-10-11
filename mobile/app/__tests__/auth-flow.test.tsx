import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { createFakeAuthService } from '@/lib/auth/fake';
import type { AuthService } from '@/lib/auth/types';

let mockService: AuthService & { calls: string[] };

jest.mock('@/lib/auth', () => {
  const actual = jest.requireActual('@/lib/auth/errors');
  const validation = jest.requireActual('@/lib/auth/validation');
  return {
    authErrorMessage: actual.authErrorMessage,
    validateCredentials: validation.validateCredentials,
    getAuthService: () => mockService,
  };
});

function mount() {
  return renderRouter('./app', { initialUrl: '/' });
}

describe('auth gate', () => {
  it('sends signed-out users to login', async () => {
    mockService = createFakeAuthService();
    await mount();
    expect(await screen.findByText('Welcome back')).toBeTruthy();
  });

  it('sends signed-in users to the tabs (itinerary first)', async () => {
    mockService = createFakeAuthService({ user: { uid: 'u1', email: 'a@b.co' } });
    await mount();
    expect(await screen.findByText('No stops yet')).toBeTruthy();
  });

  it('lets a signed-in user move between all three tabs', async () => {
    mockService = createFakeAuthService({ user: { uid: 'u1', email: 'a@b.co' } });
    await mount();
    await screen.findByText('No stops yet');
    await fireEvent.press(screen.getByText('Camera'));
    expect(await screen.findByText("Scanning isn't ready yet")).toBeTruthy();
    await fireEvent.press(screen.getByText('Route'));
    expect(await screen.findByText('No route yet')).toBeTruthy();
  });
});

describe('login screen', () => {
  it('shows validation errors and does not call the mockService for bad input', async () => {
    mockService = createFakeAuthService();
    await mount();
    await screen.findByText('Welcome back');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockService.calls).toEqual([]);
  });

  it('signs in and lands on the itinerary tab', async () => {
    mockService = createFakeAuthService();
    await mount();
    await screen.findByText('Welcome back');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'driver@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'hunter22');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('No stops yet')).toBeTruthy();
    expect(mockService.calls).toEqual(['signIn:driver@example.com']);
  });

  it('shows a friendly message when sign-in fails', async () => {
    mockService = createFakeAuthService({ failWith: { code: 'auth/invalid-credential' } });
    await mount();
    await screen.findByText('Welcome back');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'driver@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrongpass');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('switches to account creation and enforces the password length', async () => {
    mockService = createFakeAuthService();
    await mount();
    await screen.findByText('Welcome back');
    await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    expect(await screen.findByRole('header', { name: 'Create account' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 8 characters.')).toBeTruthy();
    expect(mockService.calls).toEqual([]);
  });
});

describe('sign out', () => {
  it('returns to login and drops tab access', async () => {
    mockService = createFakeAuthService({ user: { uid: 'u1', email: 'a@b.co' } });
    await mount();
    await screen.findByText('No stops yet');
    await act(async () => {
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sign out' })[0]);
    });
    await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
  });
});
