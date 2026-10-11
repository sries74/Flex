import type { AuthService, AuthUser } from './types';

/** In-memory AuthService for tests and storybook-style screens. Never used in production builds. */
export function createFakeAuthService(
  opts: { user?: AuthUser | null; failWith?: { code: string } } = {},
): AuthService & { calls: string[] } {
  let current: AuthUser | null = opts.user ?? null;
  const listeners = new Set<(u: AuthUser | null) => void>();
  const calls: string[] = [];

  const set = (u: AuthUser | null) => {
    current = u;
    listeners.forEach((l) => l(u));
  };

  return {
    calls,
    ready: async () => {},
    getCurrentUser: () => current,
    onAuthChange(listener) {
      listeners.add(listener);
      listener(current);
      return () => void listeners.delete(listener);
    },
    async signInWithEmail(email) {
      calls.push(`signIn:${email}`);
      if (opts.failWith) throw opts.failWith;
      set({ uid: 'fake-uid', email });
    },
    async signUpWithEmail(email) {
      calls.push(`signUp:${email}`);
      if (opts.failWith) throw opts.failWith;
      set({ uid: 'fake-uid', email });
    },
    async signOut() {
      calls.push('signOut');
      set(null);
    },
    getIdToken: async () => (current ? 'fake-token' : null),
  };
}
