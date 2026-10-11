# Phase 2 — Mobile Project Initialization (T-110 … T-170)

Status: implemented in `mobile/`. Verified in the cloud sandbox (no device/emulator): `npm ci` → lint → prettier → typecheck → vitest → jest → `expo export --platform android` → `expo-doctor` (21/21).

## Pinned stack (as installed 2026-10)
| Package | Version | Note |
|---|---|---|
| expo | ~57.0 (SDK 57) | React Native 0.86, React 19.2.3 |
| expo-router | ~57.0 | file routes in `mobile/app/` |
| nativewind | 4.2.7 | stable v4; v5 is preview — revisit later |
| tailwindcss | ^3.4.17 | required by NativeWind v4 |
| react-native-reanimated / worklets | 4.5 / 0.10 | |
| react-dom | 19.2.3 | pinned only to satisfy NativeWind's peer resolution (no web target) |
| babel-preset-expo | ~57.0 | must be an explicit dependency in SDK 57 |
| jest-expo / jest | ~57.0 / ~29.7 | component tests |
| @testing-library/react-native | ^14.1 | async `render` |
| vitest | ^5 | `lib/` logic |
| typescript | ~6.0 | `types` must be listed explicitly |

## Deviations from the original spec
- Project dir is `mobile/` inside the monorepo (not `~/projects/flex-companion`).
- `app.config.ts` replaces `app.json` (needed for the `store`/`sideload` variant, ADR 0002).
- Template-added `AGENTS.md`, `LICENSE`, `.claude/settings.json` removed (template guidance assumed `src/app/` and enabled a plugin; project context lives in `PROJECT-INFO.md`).
- Husky replaced by `pre-commit` framework (see docs/05).
- `expo lint` replaced by `eslint .` (it fails on directories containing only `.gitkeep`).

## NOT verified here (needs your machine)
- App actually rendering on emulator/device and NativeWind classes applying visually (bundling succeeds; styling is untested on-device).
- `npx expo run:android` dev-client build.

## Verify on your machine (WSL)
```text
cd mobile && npm ci
npm run lint && npm run typecheck && npm test
npx expo run:android      # builds dev client, needs emulator from Phase 1
```
