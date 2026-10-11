# Phase 4 (part 2) — Itinerary import & review UI

Implemented in `mobile/`. Verified in the cloud sandbox: eslint, prettier, `tsc`, Vitest **187**, Jest **47**, Android bundle, `expo-doctor` 21/21; Jest also run 4× with `--no-cache` (see "Test stability").

## What exists
| Task | Result |
|---|---|
| T-415 | `lib/ocr/pickImage.ts` — system photo picker (`expo-image-picker`, base64, quality 0.7). `lib/ocr/toImageInput.ts` validates type (JPEG/PNG) and size (≤ ~7 MB base64) with user-facing messages. |
| T-430 | Itinerary tab: scan → review list → edit. `StopCard` shows number, address, deadline, packages, and a **"Check this stop"** badge with the specific reasons. `StopEditor` (sheet) edits/adds/deletes with inline validation (`parseStopDraft`: unique stop number, readable times like "6:30 PM", window order, whole-number packages). Editing a flagged stop clears its warning. |
| — | State: `lib/itinerary/state.ts` reducer (replace/upsert/remove/restore/clear) + `ItineraryProvider` (hydrate → persist). |
| — | **Manual entry works with no server at all**, so the tab is useful before the API exists. |

## Privacy behaviour (addresses are PII)
- Saved only on the device (`expo-sqlite` key/value store, app-private), validated with Zod on load, never trusted.
- **Wiped on sign-out**, including when sign-out races a slow disk read (tested).
- Storage errors never crash the app.
- Replacing a scan asks for confirmation (it discards edits).

## Honest limits
- **Never run on a device/emulator.** The picker, SQLite store and layout are exercised only through mocks and the Android bundle step. Screenshot-to-stops has not been seen working.
- **No OCR backend exists**, so "Scan" can only succeed once `POST /v1/ocr` is built (P6) and `EXPO_PUBLIC_API_URL` is set. Without it the UI says scanning isn't set up and offers manual entry; with the URL set but no server it shows the network error.
- The on-device OCR fallback (T-421) is not built; `getOcrProviders()` returns the API provider only.
- HEIC/WebP picks are rejected with a message rather than converted.

## Test stability (found and fixed)
Two tests failed intermittently on the first run after a cold Jest cache (the first test in a file pays for transforming NativeWind/Expo Router, exceeding the default 5 s limit). Reproduced with `--no-cache`, fixed with `testTimeout: 30000` and a 5 s `asyncUtilTimeout` in `test/setup.js`. 4/4 cold-cache runs and 12 warm runs pass afterwards. CI always runs cold, so this mattered.

## Still open in Phase 4
T-400/T-410/T-425 (real redacted screenshots + accuracy eval), T-421 (on-device OCR), T-435 (geocoding), camera sorting T-440…T-460 (device), solver T-530…T-532 (VPS), location/map T-540…T-555 (device + Maps key).
