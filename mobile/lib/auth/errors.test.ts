import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './errors';

describe('authErrorMessage', () => {
  it.each([
    ['auth/invalid-credential', 'Incorrect email or password.'],
    ['auth/wrong-password', 'Incorrect email or password.'],
    ['auth/user-not-found', 'Incorrect email or password.'],
    ['auth/email-already-in-use', 'An account with this email already exists.'],
    ['auth/weak-password', 'Use at least 8 characters.'],
    ['auth/network-request-failed', 'No connection. Check your network and try again.'],
    ['auth/too-many-requests', 'Too many attempts. Wait a few minutes and try again.'],
    ['auth/not-configured', "Sign-in isn't configured in this build."],
  ])('maps %s', (code, message) => {
    expect(authErrorMessage({ code })).toBe(message);
  });

  it('falls back for unknown codes and non-errors without leaking details', () => {
    expect(authErrorMessage({ code: 'auth/something-new', message: 'secret internals' })).toBe(
      'Something went wrong. Please try again.',
    );
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
