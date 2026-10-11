import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import { createChunkedStorage } from './chunkedStorage';
import type { FirebaseConfig } from './config';
import { secureStoreBackend } from './secureStoreBackend';
import type { AuthService, AuthUser } from './types';

function getAuthInstance(config: FirebaseConfig): Auth {
  if (getApps().length > 0) return getAuth(getApp());
  const app = initializeApp(config);
  // Session tokens live in the OS keystore (T-240), not in plain AsyncStorage.
  return initializeAuth(app, {
    persistence: getReactNativePersistence(createChunkedStorage(secureStoreBackend)),
  });
}

export function createFirebaseAuthService(config: FirebaseConfig): AuthService {
  const auth = getAuthInstance(config);
  const toUser = (u: { uid: string; email: string | null } | null): AuthUser | null =>
    u ? { uid: u.uid, email: u.email } : null;

  return {
    ready: () => auth.authStateReady(),
    getCurrentUser: () => toUser(auth.currentUser),
    onAuthChange: (listener) => onAuthStateChanged(auth, (u) => listener(toUser(u))),
    async signInWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async signUpWithEmail(email, password) {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    },
    signOut: () => fbSignOut(auth),
    getIdToken: async (forceRefresh = false) =>
      auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null,
  };
}
