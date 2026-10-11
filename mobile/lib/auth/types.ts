export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthService {
  /** Resolves once the persisted session (if any) has been restored. */
  ready(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  /** Subscribe to sign-in state changes. Returns an unsubscribe function. */
  onAuthChange(listener: (user: AuthUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Firebase ID token for the API's Authorization header (T-700). */
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
}
