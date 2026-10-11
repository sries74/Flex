# FlexCompanion API (v1)

Base URL: `https://api.flexcop.ackgent.com` (staging: `https://staging-api.flexcop.ackgent.com`).
All `/v1/*` routes need `Authorization: Bearer <Firebase ID token>`. Errors are JSON `{ "error": "<code>" }` with no internals or submitted values.

| Method & path | Purpose | Success | Errors |
|---|---|---|---|
| `GET /healthz` | Liveness (public) | 200 `{status:"ok"}` | |
| `GET /readyz` | Readiness; checks the DB (public) | 200 | 503 |
| `GET /v1/me` | Current user (created on first call) | 200 `{id,email}` | 401 |
| `DELETE /v1/me` | **Erase the account** and all its itineraries/stops | 204 | 401 |
| `GET /v1/me/export` | Everything stored about you | 200 | 401 |
| `POST /v1/itineraries` | Save an itinerary: `{source:"scan"\|"manual", scannedAt?, stops:[{stopNumber,address,windowStartMin,windowEndMin,packageCount,needsReview}]}` (1–500 stops, unique numbers) | 201 `{id}` | 400 `{error:"invalid_request",fields:[…]}`, 401, 413 |
| `GET /v1/itineraries` | Your itineraries, newest first (max 50) | 200 | 401 |
| `GET /v1/itineraries/:id` | One itinerary with stops | 200 | 404 (also for other people's), 401 |
| `DELETE /v1/itineraries/:id` | Delete one | 204 | 404, 401 |
| `POST /v1/ocr` | Read an itinerary screenshot: `{image:<base64>, mimeType:"image/jpeg"\|"image/png"}` → `{stops:[{stop_number,address,delivery_window_start?,delivery_window_end?,package_count?,confidence?}]}`. The image is not stored. | 200 | 400, 413, 429 (+`Retry-After`), 502 `ocr_failed`, 503 `ocr_unavailable` |

Notes
- Times are minutes since local midnight (0–1439).
- Account deletion removes our data; the app must also delete the Firebase account (`deleteUser` in the client SDK).
- Not yet implemented: route optimization (`/v1/routes/optimize`, needs the solver — T-532), OpenAPI document + generated client (T-715).
