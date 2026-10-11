import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthService, AuthUser } from '@/lib/auth/types';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  service: AuthService;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: AuthUser | null }>({
    status: 'loading',
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    // Wait for the persisted session to be restored so we don't flash the login screen.
    service
      .ready()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        unsubscribe = service.onAuthChange((user) =>
          setState({ status: user ? 'signedIn' : 'signedOut', user }),
        );
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [service]);

  const value = useMemo(() => ({ ...state, service }), [state, service]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
