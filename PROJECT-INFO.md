# PROJECT-INFO — FlexCompanion (Agent OS context)

Read this first. Then read the task row in `docs/01-master-task-list.md`.

## What
Mobile companion for gig delivery drivers: itinerary OCR import, live camera package sorting, VRPTW route optimization + map, and an Android-only opt-in "Block Grabber" (sideload flavor only).

## Stack
Expo (CNG, TypeScript strict) · Expo Router · NativeWind · Firebase Auth · Fastify API · PostgreSQL + pgvector · VRPTW solver + road engine (ADR T-530) · Gemini Vision + on-device OCR · Kotlin Expo module · EAS Build/Submit · Fastlane (metadata) · GitHub Actions · Debian 13 VPS (Docker + Caddy).

## Repo map
`mobile/` app · `mobile/modules/block-grabber/` Kotlin · `api/` · `infra/` · `e2e/` · `community/` · `docs/` · `legacy/` (old Python bot, reference only; currently still at repo root until T-002).

## Decisions
React Native (Expo) · Reddit via owner's personal account (human posts, disclosed) · domain `flexcop.ackgent.com` (api. / staging-api. subdomains).

## Branches
`main` protected/trunk · `master` legacy · work on `feat|fix|chore|docs/T-xxx-slug` or `claude/*`, PR into `main`.

## Commands (once `mobile/` exists)
```text
npm run lint && npm run typecheck && npm test     # must pass before PR
npx vitest run | npx jest                          # unit | component
npm run eval:ocr                                   # OCR accuracy gate
npx expo run:android                               # dev client
```

## Rules for agents
1. TDD: failing test first; never skip/disable tests to get green.
2. Never commit secrets, keystores, `google-services.json`, or real customer addresses/itineraries.
3. Store builds must NOT contain the AccessibilityService (CI asserts).
4. DB/routing never exposed publicly. Gemini key lives on the API server only.
5. No Reddit posting/DMs by agents. Humans post; agents draft.
6. Human approval required: prod SSH/deploy, store submission, merge to `main`, spend > $10, destructive commands.
7. Report results faithfully: paste failing output; call out skipped steps.
8. Spec deviations C1–C12 in `docs/00-overview-and-decisions.md` override the original Google Doc.

## Docs index
`docs/README.md`
