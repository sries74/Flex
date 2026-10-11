# Phase 4 (part 1) — Core logistics logic

Pure, fully unit-tested TypeScript in `mobile/lib/` — the parts of Phase 4 that need no device, camera, map, VPS or live API. Verified in the cloud sandbox: eslint, prettier, `tsc`, Vitest **125**, Jest 23, Android bundle, `expo-doctor` 21/21. Written test-first (each module's tests failed on a missing import before implementation).

## Done
| Task | Where | Notes |
|---|---|---|
| T-405 | `lib/itinerary/itinerary.ts` | Zod-validated OCR shape → `Stop` (times as minutes since midnight). Reports per-stop `Issue`s (`duplicate_stop_number`, `missing_address`, `unparseable_time`, `window_inverted`, `low_confidence`) and sets `needsReview`. Unusable stops (duplicate / no address) are dropped *with* an issue, never silently. |
| T-450 | `lib/matching/matchLabel.ts` | Label text → stop. Returns `match` (safe to auto-act), `ambiguous` (ask the driver) or `none`. Handles abbreviations, case/punctuation, OCR typos, digit look-alikes (`1O`→`10`), units, same-building stops, explicit "Stop N" tie-break. A house number not on the itinerary never auto-matches. |
| T-420 (partial) | `lib/ocr/` | `OcrProvider` interface, `createApiOcrProvider` (`POST /v1/ocr`, bearer token, error-code mapping, never echoes server bodies), `extractWithFallback`. |
| T-535 / T-538 | `lib/routing/vroom.ts` | `buildVroomRequest` (validates coordinates/windows/ids; `[lng,lat]` order; one-sided windows filled from shift bounds) and `parseVroomResponse` (ordered stops, waits, **unassigned stops surfaced**, distance/geometry optional). |

## API contracts the server (P6) must implement
- `POST /v1/ocr` — `{ image: <base64>, mimeType: "image/jpeg"|"image/png" }` → `200 { stops: [{ stop_number, address, delivery_window_start?, delivery_window_end?, package_count?, confidence? }] }`. Errors: 401/403, 413, 429, 5xx. Server holds the Gemini key and must not retain the image (ADR 0004).
- Routing — the app must **not** call the solver directly (it stays on the internal network, C1). The API should expose an optimize endpoint and call VROOM; `lib/routing/vroom.ts` is pure so it can be reused server-side.

## Honest limits
- **Fixtures are synthetic and hand-written.** `mocks/itineraries/` was not recorded from Gemini; `mocks/routing/` was written from the VROOM docs, not from a running solver. The real contract is unverified until the solver exists (T-532) — re-record then; any difference is a bug in the adapter.
- **No accuracy numbers exist.** The OCR eval harness (T-425) needs real, redacted screenshots; the matcher's thresholds (0.75 match / 0.5 candidate / 0.15 margin) are reasoned defaults, not tuned on real labels. The plan's targets (≥95% top-1, ≤2% false positive) are **not yet measured**.
- The API OCR provider is tested against a mocked `fetch` only.
- Solver choice (ADR 0003) is still provisional.

## Still open in Phase 4 (needs your device/accounts/VPS or real data)
| Task | Blocked on |
|---|---|
| T-400, T-410, T-425 | Real itinerary screenshots from you (redacted) + eval harness |
| T-415, T-430 | UI: image picker + edit/confirm screen (can be built next; needs on-device check) |
| T-421 | On-device OCR fallback — library choice + device testing |
| T-435 | Geocoding — provider decision (self-hosted Nominatim vs Google) |
| T-440…T-460 | Camera sorting — needs a physical device |
| T-530…T-532 | VRPTW solver spike/deploy on the VPS |
| T-540…T-555 | Location + map route tab — needs device; Google Maps API key (Android) |
