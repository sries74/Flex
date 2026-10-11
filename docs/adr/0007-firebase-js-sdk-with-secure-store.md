# 0007 — Firebase JS SDK with SecureStore-backed persistence
**Status:** Accepted (T-220)

**Context:** The plan left open `@react-native-firebase` vs the JS SDK. The native SDK needs `google-services.json` / `GoogleService-Info.plist` and config plugins before anything runs; there is no Firebase project yet.

**Decision:** Use the Firebase **JS SDK** (`firebase` v13, `firebase/auth` React Native build) behind our own `AuthService` interface (`mobile/lib/auth/types.ts`). Sessions persist via `getReactNativePersistence` over `expo-secure-store` (OS keystore), wrapped in a chunking adapter because SecureStore values are size-limited. Config comes from `EXPO_PUBLIC_FIREBASE_*` env vars; if absent the app boots with an explicit "not configured" auth service.

**Consequences:** No native Firebase files needed for email/password; Google sign-in (T-230b) will need OAuth client IDs and either `expo-auth-session` or a native module — to be decided then. Swapping to `@react-native-firebase` later only touches `lib/auth/firebase.ts`. `tsconfig` maps `firebase/auth` types to the React Native build so `getReactNativePersistence` type-checks.
