# 04 — Testing Setup

## 1. Strategy

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Unit (logic) | **Vitest** | `lib/**` (schema, parser, matcher, payload builder), `api/**` | pre-commit (changed), CI |
| Component/screen | **jest-expo + @testing-library/react-native** | `app/**`, `components/**` | CI |
| Contract | Vitest + recorded JSON | Gemini, solver, API responses (`mocks/`) | CI |
| Native unit | JUnit (JVM) | Block Grabber selectors/parser/filters on captured trees | CI (Gradle) |
| Native instrumented | AndroidX Test on emulator | Dispatcher against fake "Flex-like" test app | nightly |
| DB/API integration | Vitest + ephemeral Postgres (Testcontainers/CI service) | migrations, authz | CI |
| E2E | **Maestro** | login → import → optimize → route | CI emulator, nightly |
| Eval | custom (`npm run eval:ocr`, `eval:match`) | accuracy gates | on prompt/model change + nightly |
| Perf/load | k6, Android Profiler | API, solver, camera fps | pre-release |
| Security | `npm audit`/OSV, Semgrep, gitleaks, MobSF (optional) | deps, code, secrets | CI + monthly |

Pyramid target: ~70% unit/contract, ~25% component/integration, ~5% E2E.

## 2. Spec deviation (C4)

Spec §4.1 installs Vitest + RNTL. RN transforms are unreliable under Vitest, so: **jest-expo** for anything importing `react-native`; **Vitest** for pure TypeScript. One `npm test` runs both (`"test": "npm-run-all test:unit test:rn"`).

## 3. TDD loop (every task)

1. Write a failing test from the task's **Done when**.
2. `npx vitest run <file>` / `npx jest <file>` → confirm RED for the right reason.
3. Implement minimum → GREEN.
4. Refactor; run full `npm test`, `npm run lint`, `npm run typecheck`.
5. Commit test + code together (`test:` commit may precede `feat:`).

## 4. Fixtures & mocks (`mobile/mocks/`)

```
mocks/
├── itineraries/   *.png (synthetic/redacted) + *.expected.json
├── gemini/        recorded structured responses (+ error/timeout cases)
├── routing/       solver request/response pairs incl. infeasible
├── geocode/       address → lat/lng samples
├── labels/        package-label photos/text + expected stop match
├── a11y-trees/    Flex UI node-tree captures (own device) for Kotlin tests
└── api/           OpenAPI example responses
```

Rules: **no real customer names/addresses** (blur/replace); record real responses once with a script (`scripts/record-*.ts`), commit sanitized; mocks served via MSW (API/Gemini/solver).

## 5. Quality gates (CI must pass to merge)

| Gate | Threshold |
|---|---|
| Lint + typecheck | 0 errors |
| Unit/component | all pass; coverage `lib/` ≥ 85% lines, new code ≥ 80% |
| Kotlin unit | all pass; parser/filter ≥ 95% branches |
| OCR eval | stop_number ≥ 95%, address ≥ 90%, delivery_window_end ≥ 92% (no regression > 1 pt vs `main`) |
| Matcher eval | ≥ 95% top-1 on label fixtures; false-positive ≤ 2% |
| Solver contract | schema valid; infeasible fixture yields `violations[]` |
| Store-flavor assertion | merged manifest has **no** `AccessibilityService`; iOS bundle has no `block-grabber` ref |
| Security | gitleaks clean; no High/Critical in prod deps |
| Migrations | up/down on empty + seeded DB |

Flaky tests: quarantine is **not allowed** — root-cause within 24 h.

## 6. Performance budgets

| Metric | Budget |
|---|---|
| Cold start (mid-range Android) | ≤ 2.5 s |
| Camera frame → label text | ≤ 150 ms/frame @ 2–4 fps |
| OCR import (Gemini) p95 | ≤ 6 s |
| Optimize 30 stops p95 | ≤ 8 s |
| API p95 (CRUD) | ≤ 300 ms |
| JS bundle (Android) | ≤ 12 MB |
| Crash-free sessions | ≥ 99.5% |

## 7. Device/OS matrix (`docs/qa/test-matrix.md`)

Android: Pixel emulator API 35 (CI), Pixel 6/7 API 34 (physical), Samsung mid-range API 33, low-end ≤ 4 GB RAM device. iOS: simulator latest, one physical iPhone (≥ 2 OS versions back). Block Grabber: ≥ 2 OEMs (Samsung + Pixel).

## 8. CI layout (`.github/workflows/`)

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | PR, push main | lint, typecheck, vitest, jest-expo, api tests (PG service), gitleaks |
| `native.yml` | PR touching `modules/**` | Gradle unit tests, manifest assertion |
| `e2e.yml` | nightly + label `e2e` | Maestro on emulator (reactivecircus/android-emulator-runner) |
| `eval.yml` | PR touching `lib/ocr/**`, prompts; nightly | OCR/matcher eval, report as PR comment |
| `release.yml` | tag `v*` | see [07](07-production.md) |

Gemini calls in CI use recorded mocks; a nightly job (budget-capped key) hits the real API as a drift canary.

## 9. Manual QA scripts (in `docs/qa/`)

Smoke (10 min), camera sort (printed labels in low light/angles), airplane-mode, permission-denied paths, token expiry, Block Grabber consent + kill-switch, account deletion.
