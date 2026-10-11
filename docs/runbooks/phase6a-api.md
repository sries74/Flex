# Phase 6 (part 1) — API service

`api/`: Fastify 5 + TypeScript (strict, NodeNext). Endpoints: [`docs/api/README.md`](../api/README.md).

## What exists
| Task | Result |
|---|---|
| T-700 | App with `/healthz`, `/readyz`; **Firebase ID-token verification** (`jose`, Google securetoken JWKS: RS256 only, issuer/audience pinned, `sub` required, `auth_time` not in the future) |
| T-710 | `pg` adapter behind a small `Db` interface; transactional up/down migration runner (`npm run migrate [up\|down n]`); `0001_init` schema |
| T-715 (partial) | `/v1/me`, itinerary create/list/get/delete, hand-documented API (no OpenAPI/generated client yet) |
| T-745 | `DELETE /v1/me` (cascades) and `GET /v1/me/export` |
| — | `POST /v1/ocr`: Gemini REST client, per-user rate limit, response validated before it is returned |
| — | `purgeOldItineraries(db, days)` for retention (not scheduled yet) |

## Security properties (each has a test)
- Authentication runs in `onRequest`, **before the body is parsed** — an unauthenticated 2 MB body gets 401, not parsed. (Found by test: the first version used `preHandler`.)
- Other users' itineraries return **404, not 403**, and cannot be deleted.
- `alg: none` and HS256-with-public-key (algorithm confusion) tokens are rejected.
- Error bodies never echo submitted values; the Gemini key travels in a header, never the URL; provider error text is never returned or logged.
- Validation reports field *names* only. Request bodies and `Authorization` are not logged.
- Pool `error` handler: without it a dropped idle DB connection crashes the process (found against real Postgres; test kills backends and checks the pool recovers).

## Verification
- eslint ✔ · prettier ✔ · `tsc` ✔ · **102 tests**, run **twice**: on in-process PGlite (default) and on a **real Postgres 16 server** (`TEST_DATABASE_URL`, which also tests the production `pg` adapter). CI runs the real-server mode via a `postgres:16` service.
- `npm run build` ✔; startup fails fast with a clear message on bad config.
- Tests written first for verifier, migrations, itinerary routes, auth ordering, Gemini client, config and the pool fix. **Exception:** the OCR *route* was written before its tests (they passed immediately), so they did not demonstrate red→green.

## Not verified / not done
- **Gemini is untested against the real API**: the request/response shapes follow Google's REST docs from memory, and `GEMINI_MODEL` is deliberately not defaulted. Expect to adjust once you have a key — try it with a *synthetic* screenshot first.
- **Never run against real Firebase tokens** (verifier tested with locally signed JWTs and a local JWKS).
- Token **revocation** is not checked (needs Admin SDK); tokens last ≤ 1 h.
- The rate limiter is in-memory (correct for one instance).
- No OpenAPI/generated client, no route-optimization endpoint, no pgvector (T-720), no scheduled retention job.
- Infra not done: Dockerfile, Compose, Caddy, backups, staging (T-705, T-725, T-730, T-740), observability (T-735).

## Configuration
`DATABASE_URL`, `FIREBASE_PROJECT_ID` (required); `GEMINI_API_KEY` + `GEMINI_MODEL` (together, or OCR returns 503); `OCR_RATE_PER_MIN` (10), `PORT` (3000), `LOG_LEVEL`, `RUN_MIGRATIONS=true` to migrate on boot.
