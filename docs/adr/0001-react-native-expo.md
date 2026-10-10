# 0001 — React Native with Expo (CNG)
**Status:** Accepted (owner, 2026-10-07)

**Context:** One TypeScript codebase for iOS + Android; Android-only native module needed; owner develops on Windows 11/WSL2.

**Decision:** React Native via Expo (Continuous Native Generation), Expo Router, NativeWind, dev client (not Expo Go). Native Android code lives in a local Expo module with a config plugin; `android/` and `ios/` are generated and git-ignored.

**Consequences:** Config plugins instead of hand-edited native files; iOS builds via EAS cloud; native modules require dev builds.
