# 05 — Development Setup

## 1. Monorepo layout

```
Flex/
├── legacy/                     # old Python bot (reference only)
├── mobile/                     # Expo app (spec §3 tree lives here)
│   ├── app/                    # Expo Router: (auth)/login, (tabs)/{itinerary,camera,route}
│   ├── components/
│   ├── lib/                    # ocr/ itinerary/ matching/ routing/ api/ (generated client)
│   ├── modules/block-grabber/  # Kotlin Expo module (local module) — sideload flavor only
│   ├── native/                 # (spec name) → alias: use modules/; keep native/ docs only
│   ├── mocks/                  # see 04 §4
│   ├── devops/                 # EAS + Fastlane scripts (fastlane/android, fastlane/ios)
│   ├── screenshots/
│   ├── app.config.ts           # dynamic config (variant, plugins)
│   └── eas.json
├── api/                        # Fastify API + migrations
├── infra/                      # docker-compose.{prod,staging}.yml, Caddyfile, routing config
├── community/                  # reddit playbook, drafts, FAQ
├── e2e/                        # Maestro flows
├── docs/                       # this plan, ADRs, runbooks
└── PROJECT-INFO.md             # agent context
```

`native/` in the spec is superseded by `modules/` (Expo local-module convention).

## 2. Branching & commits

- Trunk-based: PR → `main`. Squash merge. Branch names `feat|fix|chore|docs/T-xxx-slug`.
- Conventional Commits: `feat(ocr): …`, `test(matching): …`. Footer references `T-xxx`.
- PR size ≤ ~400 changed lines where possible.
- PR template sections: Summary · Task ID · Done-when evidence · Tests run · Screenshots · Security/PII checklist · Rollback.
- Protected `main`: required CI, 1 review (human or approved agent review), no force-push.

## 3. Conventions

- TypeScript `strict`; no `any` without comment; Zod at all trust boundaries (OCR output, API responses).
- Provider/adapter pattern for external deps (OCR, solver, geocoder, auth).
- Feature flags via `app.config.ts` `extra.variant` (`store` | `sideload`) and remote config.
- Errors: typed `Result` for expected failures; Sentry for unexpected.
- Logging: no PII (addresses, names) in logs/Sentry — scrub in `beforeSend`.
- Style: Prettier + ESLint (expo preset) ; Kotlin: ktlint.

## 4. Build order (dependency-driven)

1. **Skeleton**: P2 → app boots, CI green.
2. **Schema first**: `Itinerary/Stop` Zod schema (T-405) — everything keys off it.
3. **Vertical slice 1** (earliest demo): fixture itinerary → parsed stops → list screen (no network).
4. **OCR live** (Gemini via API proxy) → edit/confirm.
5. **Routing**: payload → solver (staging) → map. Demo: screenshot in, optimized route out.
6. **Camera sort** (needs schema + matcher).
7. **Backend persistence** + history.
8. **Block Grabber** (isolated stream).
9. Polish, E2E, perf, release.

## 5. Implementation notes per feature

**OCR import** — `OcrProvider.extract(imageUri) → Promise<Stop[]>`; Gemini via API (`POST /v1/ocr`, server holds key, rate-limited per user); on-device fallback; both validated by Zod; low-confidence fields flagged for user edit.

**Live camera sorting** — sample frames, run on-device text recognition (ML Kit via vetted Expo-compatible lib; verify at T-445), normalize → `matchLabel(text, stops)`; debounce results; haptic + color feedback; keep camera/JS thread work off the render path.

**Routing** — payload: vehicles (1, start/end depot), services (stop id, location, `time_windows`, service duration), matrix from road engine. Result → ordered stops, arrival ETAs, encoded polyline, `violations[]`. `react-native-maps` renders; deep-link legs to navigation apps.

**Block Grabber** — AccessibilityService event → snapshot node tree → selector layer → parser → filter → (rate-limited) dispatcher; state & log exposed via Expo Module events; TS wrapper guards platform + variant. Detailed task chain T-600…T-660. Remote selector + kill-switch from API (signed).

**Auth** — Firebase ID token → `Authorization: Bearer` → API verifies with Firebase Admin; user row upserted by `uid`.

## 6. Local dev loop

```text
# terminal 1 (WSL)
cd mobile && npx expo start --dev-client
# terminal 2
cd api && npm run dev          # local PG via infra/docker-compose.dev.yml
# tests while coding
npx vitest            # watch
npx jest --watch
```

Dev client needed (native modules, maps, Firebase) — Expo Go is insufficient.

## 7. Definition of Done (any task)

Code + tests merged · CI green · docs/ADR updated · no new lint/type errors · no secrets/PII · Done-when evidence in PR · issue closed with handoff block.
