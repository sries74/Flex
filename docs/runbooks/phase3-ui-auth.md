# Phase 3 — UI Shell & Auth (T-200 … T-250)

Implemented in `mobile/`. Verified in the cloud sandbox: eslint, prettier, `tsc`, Vitest (36), Jest (23), Android bundle (Metro resolves the React Native build of `firebase/auth`), `expo-doctor` 21/21.

## What exists
| Task | Result |
|---|---|
| T-200 | `components/ui`: `Button` (48dp targets, loading/disabled/busy a11y state), `Card`, `TextField` (label, inline error), `Sheet` (Modal bottom sheet); dark-mode classes throughout |
| T-210 | Tabs `app/(tabs)`: Itinerary, Camera, Route (stub screens); `app/index.tsx` redirects `/` by auth state |
| T-220 | `lib/auth`: `AuthService` interface, Firebase implementation, fake (tests), "unconfigured" stub — see ADR 0007 |
| T-230 | `app/(auth)/login.tsx`: email + password sign-in / create-account, validation, friendly errors; root `Stack.Protected` gate (signed-out → login, signed-in → tabs); Sign out in tab header |
| T-240 | Session persisted in `expo-secure-store` via chunking adapter (unit-tested) |
| T-250 | `LoadingState` / `EmptyState` / `ErrorState`; tab screens use empty states; root shows loading while the session is restored |

## You need to do (Firebase, ~10 min)
1. Firebase console → create project → **Authentication → Sign-in method → Email/Password: enable**.
2. Project settings → Your apps → add a **Web app** (not Android/iOS — we use the JS SDK).
3. Copy the four values into `mobile/.env.local` (git-ignored; template in `mobile/.env.example`):
   `EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_APP_ID`.
4. `cd mobile && npx expo start --dev-client`, create an account on the login screen, kill and relaunch the app — you should stay signed in.

Without these values the app still runs; sign-in shows "Sign-in isn't configured in this build."

## Not verified / deferred
- **Never run against a real Firebase project or on a device/emulator.** Auth is tested against the fake service; the Firebase wrapper (`lib/auth/firebase.ts`) is type-checked and bundled only.
- **SecureStore persistence** on a real device (chunking logic is unit-tested; the OS keystore is not).
- **Google sign-in** (T-230 mentions it) deferred as **T-230b** — needs OAuth client IDs; see ADR 0007.
- Tab icons (text labels only for now).
- The Firebase API key is a public identifier by design; real protection comes from the API verifying ID tokens (T-700) and Firebase auth settings.

## Test notes
- Route tests use `expo-router/testing-library` (`renderRouter('./app')`) with `@/lib/auth` mocked to a fake service.
- `expo-router`'s `toHavePathname` matcher doesn't work with RNTL v14's async `render` (it attaches helpers to a Promise), so route tests assert on visible content instead.
- Jest needs `standard-navigation` in `transformIgnorePatterns`, a CSS stub (`test/styleMock.js`), and the `@/` alias mapper.
