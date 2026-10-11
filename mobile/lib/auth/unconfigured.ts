import type { AuthService } from './types';

const notConfigured = () => Promise.reject({ code: 'auth/not-configured' });

/** Used when Firebase env vars are missing so the app still boots and explains why sign-in fails. */
export const unconfiguredAuthService: AuthService = {
  ready: async () => {},
  getCurrentUser: () => null,
  onAuthChange(listener) {
    listener(null);
    return () => {};
  },
  signInWithEmail: notConfigured,
  signUpWithEmail: notConfigured,
  signOut: async () => {},
  getIdToken: async () => null,
};
