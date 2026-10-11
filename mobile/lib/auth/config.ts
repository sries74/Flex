export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** Reads EXPO_PUBLIC_FIREBASE_* values. Returns null if any is missing. These are public identifiers, not secrets. */
export function readFirebaseConfig(
  env: Record<string, string | undefined> = process.env,
): FirebaseConfig | null {
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}
