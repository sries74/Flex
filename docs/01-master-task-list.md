# 01 — Master Task List

Legend — **Owner** = agent role from [02](02-agent-workflows.md). **Dep** = prerequisite task IDs. **Done when** = acceptance criteria (all must be verifiable by a command or artifact). Sizes: S ≤ ½ day, M ≈ 1–2 days, L ≈ 3–5 days.
Every code task follows the TDD loop in [04](04-testing-setup.md) and the PR loop in [02 §3](02-agent-workflows.md).

## P0 — Repo & governance (week 0)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-001 | Create `main` from `master`, push, set as default, enable branch protection (PR + CI required, no force-push) | DevOps | — | S | `git ls-remote origin main` ok; protection rule visible |
| T-002 | Move legacy Python bot to `legacy/` with README note ("reference only, not shipped") | Architect | T-001 | S | Tree restructured; no code changes |
| T-003 | Add `PROJECT-INFO.md`, `docs/`, `.github/` (PR template, issue templates, CODEOWNERS) | Docs | T-001 | S | Files merged |
| T-004 | Resolve open decisions D1–D6 ([00 §5](00-overview-and-decisions.md)) | Orchestrator + owner | — | S | Decisions recorded as ADRs in `docs/adr/` |
| T-005 | Create GitHub labels (`agent:*`, `phase:*`, `type:*`) and a Project board; one issue per task below | Orchestrator | T-001 | M | Issue count = task count |
| T-006 | Add secret scanning + `.gitignore` (`.env*`, keystores, `google-services.json`, `*.p8`) | Security | T-001 | S | `run_secret_scanning` clean; pre-commit hook active |

## P1 — Environment (week 1) → see [03](03-environment-setup.md)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-100 | WSL2 Ubuntu 24: nvm, Node LTS, pnpm/npm, git, micro, zsh | DevOps | — | S | `node -v`, `git -v` ok |
| T-101 | EAS CLI + Expo account login | DevOps | T-100 | S | `eas whoami` returns user |
| T-102 | Android Studio (Windows), SDK 35+, emulator AVD (Pixel, API 35) | DevOps | — | M | Emulator boots; `adb devices` lists it |
| T-103 | WSL↔Windows adb bridge (C8) | DevOps | T-100, T-102 | S | `adb devices` in WSL shows emulator |
| T-104 | JDK 17 + Kotlin tooling for native module | DevOps | T-100 | S | `./gradlew -v` ok |
| T-105 | VPS bootstrap (Debian 13): non-root user, SSH keys only, ufw, fail2ban, unattended-upgrades, Docker | DevOps | — | M | Hardening checklist in 03 §5 all ✔ |
| T-106 | Accounts: Expo, Google Play Console, Apple Developer, Firebase, Google AI Studio (Gemini), Sentry, Reddit | Owner | — | M | Credentials in password manager; none in repo |
| T-107 | Secrets strategy: GH Actions secrets, EAS secrets, VPS `.env` (0600) | Security | T-106 | S | Documented; `.env.example` committed |

## P2 — Project initialization (week 1–2)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-110 | `npx create-expo-app@latest mobile --template blank-typescript` inside monorepo | Frontend | T-002, T-100 | S | `npx expo start` boots in emulator |
| T-120 | Install Expo Router + peer deps (spec §2.2); set `main` entry & scheme | Frontend | T-110 | S | Router "Hello" screen renders |
| T-130 | NativeWind + Tailwind (version-pinned per C5), `tailwind.config.js` content paths, babel/metro, `global.css` | Frontend | T-120 | M | A `className` styled component renders on Android |
| T-140 | Create directory skeleton ([05 §1](05-development-setup.md)) incl. `mocks/`, `devops/`, `screenshots/` | Architect | T-120 | S | Tree matches |
| T-150 | TypeScript strict, ESLint, Prettier, Husky + lint-staged | Frontend | T-110 | S | `npm run lint && npm run typecheck` pass |
| T-160 | Test harnesses: jest-expo + RNTL (components), Vitest (lib) | QA | T-110 | M | One passing test in each; `npm test` runs both |
| T-170 | CI v0: GitHub Actions (lint, typecheck, test) on PR | DevOps | T-150, T-160 | M | Required check green on a sample PR |

## P3 — UI shell & auth (week 2–3)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-200 | Design tokens, base components (Button, Card, Input, Sheet), dark mode | Frontend | T-130 | M | Storybook-lite screen or tests for each |
| T-210 | Tab layout `app/(tabs)/_layout.tsx` + stub screens: itinerary, camera, route | Frontend | T-200 | S | Navigation test passes |
| T-220 | Firebase project; `@react-native-firebase` or JS SDK (decide w/ CNG config plugin) | Frontend | T-106 | M | Dev build signs in test user |
| T-230 | `app/(auth)/login.tsx` — email/password + Google; auth gate redirect | Frontend | T-220 | M | Tests: unauth→login, auth→tabs |
| T-240 | Secure token storage (`expo-secure-store`); refresh handling | Frontend | T-230 | S | Token survives app restart |
| T-250 | Empty/loading/error states for all tabs | Frontend | T-210 | S | Snapshot/RNTL tests |

## P4 — Core logistics features (week 3–7)

### 4A. Itinerary OCR import

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-400 | Collect 20+ **synthetic/redacted** itinerary screenshots → `mocks/itineraries/` with ground-truth JSON | OCR | T-140 | M | Fixtures + schema (`stop_number`, `address`, `delivery_window_end`, optional `window_start`, `package_count`) |
| T-405 | Zod schema + parser/normalizer (`lib/itinerary/schema.ts`) | OCR | T-400 | S | Unit tests green |
| T-410 | Privacy design: redaction, no raw-image retention, consent text | Security | T-400 | S | ADR merged; checklist in PR template |
| T-415 | `expo-image-picker` screen + permission UX | Frontend | T-210 | S | Picks image, returns URI (RNTL w/ mock) |
| T-420 | OCR provider interface `OcrProvider`; **GeminiVisionProvider** (structured-output JSON, schema-constrained) | OCR | T-405 | M | Contract tests vs recorded responses in `mocks/gemini/` |
| T-421 | **MlKit/Tesseract fallback provider** + provider selection/fallback logic | OCR | T-420 | M | Offline test passes; accuracy report |
| T-425 | Accuracy harness: field-level precision/recall on fixtures | QA | T-420 | M | `npm run eval:ocr` outputs report; gate ≥ 95% on stop_number, ≥ 90% address |
| T-430 | Edit/confirm screen for parsed stops (user fixes errors) | Frontend | T-420 | M | RNTL tests; edits persist |
| T-435 | Geocode addresses (via routing service/Nominatim self-host or Google) | Routing | T-420 | M | Address → lat/lng with confidence; fail list surfaced |

### 4B. Live camera sorting

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-440 | `expo-camera` screen, permissions, lifecycle | Frontend | T-210 | S | Preview renders on device |
| T-445 | Frame sampling (2–4 fps) → on-device text recognition → label text | OCR | T-440 | L | Perf budget: ≤ 150 ms/frame on mid-range device |
| T-450 | Label↔stop matcher (fuzzy address/name/stop #; threshold; ambiguity handling) in `lib/matching/` | OCR | T-405 | M | Property tests + fixtures; ≥ 95% on label fixtures |
| T-455 | Sorting UX: green/red overlay, "stop N → shelf/bag X", haptics, undo | Frontend | T-445, T-450 | M | Manual QA script passes on 2 devices |
| T-460 | Local persistence of sort session (SQLite/`expo-sqlite`) | Frontend | T-455 | S | Survives app kill |

### 4C. Route optimization (VRPTW)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-530 | **Spike**: choose solver (C3); benchmark 50 stops w/ windows | Routing | T-105 | M | ADR with latency/quality numbers |
| T-531 | Deploy road engine (GraphHopper/OSRM) for region extract on VPS (Docker, internal network) | Routing | T-105, T-530 | M | `/route` responds in < 300 ms |
| T-532 | Deploy VRPTW solver per ADR | Routing | T-530 | L | Sample 30-stop problem solves in < 5 s |
| T-535 | Payload builder `lib/routing/buildPayload.ts` (stops → solver JSON; time windows, service time, depot) | Routing | T-405 | M | Contract tests with `mocks/routing/` |
| T-538 | Response parser: ordered stops, ETAs, polyline, violations list (R7) | Routing | T-535 | M | Infeasible fixture → partial route + reasons |
| T-540 | `expo-location` + start position/depot selection | Frontend | T-210 | S | Permission tests |
| T-545 | `react-native-maps` route tab: markers, polyline, ETA list, re-optimize button | Frontend | T-538, T-540 | L | Renders fixture route; Android + iOS dev build |
| T-550 | Handoff to nav app (deep link Google Maps/Waze per leg) | Frontend | T-545 | S | Opens correct destination |
| T-555 | Offline cache of last route | Frontend | T-545 | S | Airplane-mode test |

## P5 — Android Block Grabber (week 6–9, sideload flavor only — see R1/R2)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-600 | ADR: flavor gating (`FLEX_VARIANT=sideload`), consent UX, legal copy | Security + Architect | T-004 | S | ADR merged |
| T-605 | `npx create-expo-module@latest` local module `modules/block-grabber` (Kotlin) | Native | T-600 | M | Module builds in dev client |
| T-610 | Expo config plugin: adds service + `accessibility_service_config.xml`, only when variant=sideload | Native | T-605 | M | Store build manifest has **no** accessibility service (asserted in CI) |
| T-615 | Capture real Flex UI node trees (own account, own device) → `mocks/a11y-trees/*.json` | Native | T-102 | M | ≥ 10 fixtures: offers list, offer detail, accept dialog, error states |
| T-620 | Selector layer (JSON-configured, versioned) + tree parser | Native | T-615 | M | JVM unit tests on fixtures |
| T-625 | Block parser: pay, duration, location, time → `Block` model | Native | T-620 | M | Unit tests ≥ 95% branch coverage |
| T-630 | Filter engine: min pay, min $/hr, warehouses, weekdays, time ranges | Native | T-625 | M | Table-driven tests |
| T-635 | Action dispatcher: gesture/`performAction(CLICK)` on Accept; rate limit + jitter; max-accepts/day | Native | T-630 | M | Instrumented test on emulator with fake Flex-like test app |
| T-640 | Expo Modules API surface: `start/stop/isEnabled/setConfig/onEvent`; TS types | Native | T-635 | M | Typed, JS mock for tests |
| T-645 | TS guard `Platform.OS === 'android' && variant==='sideload'`; iOS no-op stub | Frontend | T-640 | S | iOS bundle contains no reference (CI grep) |
| T-650 | Settings UI: thresholds, enable service deep-link to Accessibility settings, status, **kill-switch**, event log | Frontend | T-645 | M | RNTL + manual QA |
| T-655 | Remote selector update + kill-switch endpoint | Backend | T-700, T-620 | M | Selector JSON signed + fetched; revoke works |
| T-660 | Battery/foreground-service/notification handling; OEM quirks doc | Native | T-635 | M | 4-hour soak test on 2 OEMs |

## P6 — Backend & infrastructure (parallel, week 2–8)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-700 | API service skeleton (Fastify/TS), `/healthz`, Firebase ID-token verification middleware | Backend | T-105, T-220 | M | Auth tests (valid/expired/forged) |
| T-705 | `infra/docker-compose.yml`: db (pgvector, **internal only**), api, routing, caddy; healthchecks; named volumes | DevOps | T-105 | M | `docker compose up -d` healthy on VPS |
| T-710 | DB schema + migrations (users, itineraries, stops, routes, route_stops, sort_sessions, embeddings) | Backend | T-705 | M | Migration up/down tested in CI against ephemeral PG |
| T-715 | CRUD endpoints + OpenAPI spec; generated TS client in `lib/api` | Backend | T-710 | L | Contract tests green |
| T-720 | pgvector use: address embedding for fuzzy match / history dedupe (only if proven useful in T-450) | Backend | T-710, T-450 | M | Benchmarked vs trigram; keep or cut |
| T-725 | Caddy TLS + domain + rate limiting + CORS | DevOps | T-705 | S | A+ on SSL test |
| T-730 | Backups: nightly `pg_dump` → off-box storage, retention 14d, **restore drill** | DevOps | T-705 | M | Restore into scratch DB verified |
| T-735 | Observability: Sentry (app+api), uptime monitor, container log rotation | DevOps | T-705 | S | Test error visible in Sentry |
| T-740 | Staging environment (second compose project / subdomain) | DevOps | T-725 | M | PRs deploy to staging |
| T-745 | Account deletion + data export endpoints (store requirement) | Backend | T-715 | M | E2E test deletes all user rows |

## P7 — Integration, E2E, hardening (week 8–10)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-800 | E2E flows in Maestro: login → import itinerary (fixture) → optimize → view route | QA | P4, T-715 | L | Green on CI emulator |
| T-805 | Perf pass: cold start, camera fps, route render, memory | QA | T-800 | M | Budgets in 04 §6 met |
| T-810 | Security review: OWASP MASVS-lite, API authz tests, dependency audit, secrets scan | Security | T-800 | M | Report; no High open |
| T-815 | Accessibility pass (TalkBack/VoiceOver, contrast, touch targets) | Frontend | T-800 | M | Checklist done |
| T-820 | Privacy policy, ToS, data-safety/privacy labels, in-app consent | Security + Docs | T-410, T-745 | M | Published URL |
| T-825 | Load test API + solver (k6) at 10× expected | QA | T-532, T-715 | M | p95 targets in 04 §6 |
| T-830 | Release candidate freeze; changelog | Orchestrator | all P7 | S | `v0.1.0-rc.1` tag |

## P8 — Deployment pipeline → see [07](07-production.md)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-900 | `eas build:configure`; `eas.json` profiles: development, preview, production, **sideload** | DevOps | T-130 | M | Profiles build in cloud |
| T-905 | Android signing (Play App Signing, upload key), iOS certs/profiles via EAS-managed creds | DevOps | T-106 | M | Signed AAB/IPA produced |
| T-910 | Fastlane (`devops/fastlane/`): `supply` (Android metadata), `deliver` (iOS metadata/screenshots); Bundler setup | DevOps | T-905 | M | `bundle exec fastlane` lanes run dry |
| T-915 | Screenshots pipeline → `screenshots/` (device frames, 2 locales) | Frontend | T-815 | M | Required sizes present |
| T-920 | GH Actions release workflow: tag → test → EAS build → EAS submit (internal/TestFlight) | DevOps | T-170, T-905 | L | Tag produces TestFlight + Play internal build |
| T-925 | OTA updates (`expo-updates`) channels; runtime-version policy | DevOps | T-900 | S | OTA reaches preview build |
| T-930 | Sideload distribution: signed APK on GitHub Releases + landing page w/ risk disclosure + checksum | DevOps | T-610, T-900 | M | APK installs on clean device |
| T-935 | Store listings (copy, keywords, age rating, data safety, review notes + demo account) | Docs | T-820, T-915 | M | Submitted for review |

## P9 — Beta, Reddit, launch, post-production → see [06](06-reddit-workflow.md), [08](08-post-production.md)

| ID | Task | Owner | Dep | Size | Done when |
|---|---|---|---|---|---|
| T-950 | Reddit research: subreddit rules, ToS, API terms; write `community/reddit-playbook.md` | Community | T-004 | S | Rules matrix signed off |
| T-955 | Pre-launch content kit (post drafts, FAQ, demo GIFs), human-approved | Community | T-915 | M | Approved drafts in repo |
| T-960 | Closed beta (TestFlight + Play internal, 20–50 users) | Orchestrator | T-920 | M | 20 active testers |
| T-965 | Feedback intake pipeline (Reddit/DM/form → GitHub issues) | Community | T-005 | M | Triage SLA met in dry run |
| T-970 | Open beta + Reddit announcement (human posts) | Community | T-960 | M | Posts live, disclosure present |
| T-975 | Production release: staged rollout 5→20→50→100% | DevOps | T-935, T-960 | M | 100% w/ crash-free ≥ 99.5% |
| T-980 | Post-launch: monitoring dashboards, on-call, support macros | DevOps + Community | T-975 | M | See 08 |
| T-985 | Retro + roadmap v1.1 | Orchestrator | T-980 | S | ADR/roadmap merged |

## Critical path

`T-001 → T-100/102/105 → T-110..T-130 → T-160/170 → T-405 → T-420 → T-535 → T-532 → T-545 → T-800 → T-830 → T-905/920 → T-960 → T-975`
Block Grabber (P5) is off the critical path for store release by design (R1/R2).

## Suggested timeline (single owner + agents)

| Weeks | Focus |
|---|---|
| 0–1 | P0, P1 |
| 1–3 | P2, P3, P6 start |
| 3–7 | P4 (A/B/C in parallel via agents) |
| 6–9 | P5 |
| 8–10 | P7 |
| 10–12 | P8, closed beta, Reddit |
| 12–14 | Open beta → production rollout |
