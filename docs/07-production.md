# 07 — Production

## 1. Build variants

| Variant | Contents | Channel | Block Grabber |
|---|---|---|---|
| `development` | dev client | internal | included (debug) |
| `preview` | QA build | internal distribution / TestFlight / Play internal | included on Android for QA only |
| `production` (store) | release AAB / IPA | Play / App Store | **excluded** (R1/R2) |
| `sideload` | signed APK | GitHub Releases + landing page | included, consent-gated |

`eas.json` sketch (T-900): each profile sets `env.FLEX_VARIANT`, `channel`, `distribution`, `autoIncrement`; `production` uses `app-bundle`; `sideload` uses `apk`.

## 2. Pre-release checklist (RC freeze, T-830)

- [ ] All P0–P7 tasks closed; CI green on `main`
- [ ] Version bump (semver) + `CHANGELOG.md`
- [ ] Store-flavor manifest assertion passes (no AccessibilityService)
- [ ] Security review: no High open; secrets scan clean; `npm audit` reviewed
- [ ] Privacy policy + ToS live; data-safety (Play) + privacy nutrition labels (Apple) match actual data flows (Gemini, Firebase, Sentry)
- [ ] Account deletion works in-app and via web URL
- [ ] Perf budgets met ([04 §6](04-testing-setup.md))
- [ ] Backups restored successfully within last 30 days
- [ ] Staging soak ≥ 48 h, no Sev1/2
- [ ] Demo account + review notes prepared
- [ ] Rollback plan written (below)

## 3. Release pipeline (`release.yml`, T-920)

```
tag vX.Y.Z
 └─ test (lint/type/unit/rn/api/native) ──► eval gates
     └─ eas build --platform android --profile production   (cloud, or --local on Linux runner)
     └─ eas build --platform ios     --profile production   (cloud; C7)
     └─ eas build --platform android --profile sideload     (APK)
         └─ manual approval (environment: production)
             ├─ eas submit → Play (internal track) / App Store Connect (TestFlight)
             ├─ fastlane supply / deliver  (metadata, screenshots)        [devops/fastlane]
             ├─ GitHub Release: APK + SHA-256 + notes
             └─ eas update --channel production (OTA for JS-only fixes)
```

Local fallback from spec §8.4: `eas build --platform android --profile production --local` on WSL; Fastlane lanes `upload_android` / `upload_ios` live in `devops/fastlane/` and run via `bundle exec`. iOS submission requires EAS cloud (or a Mac).

## 4. Store submission

| Item | Android (Play) | iOS (App Store) |
|---|---|---|
| Signing | Play App Signing, upload key in EAS | EAS-managed distribution cert + profile |
| Listing | title, short/long desc, screenshots (phone + 7"/10" if offered), feature graphic | name, subtitle, keywords, screenshots (6.9", 6.5", iPad if supported) |
| Compliance | Data safety form, permissions declaration (camera, location, **no** Accessibility), target API level | Privacy labels, camera/location usage strings, sign-in w/ account deletion, review notes + demo creds |
| Rollout | internal → closed → open → production staged | TestFlight → phased release (7-day) |
| Age rating | complete questionnaire | complete questionnaire |

Typical review risks: minimum-functionality (4.2), data collection transparency, trademark use ("Amazon"/"Flex" in name/screenshots → avoid; "for delivery drivers" wording + disclaimer "not affiliated with Amazon").

## 5. Staged rollout

| Stage | Audience | Hold | Advance if |
|---|---|---|---|
| Internal | team | 2 d | no Sev1/2 |
| Closed beta | 20–50 | 1–2 wk | crash-free ≥ 99%, feedback triaged |
| Open beta | public opt-in | 1–2 wk | crash-free ≥ 99.3% |
| Prod 5% | | 48 h | crash-free ≥ 99.5%, ANR < 0.5% |
| 20% → 50% → 100% | | 48 h each | same |

Halt criteria: crash-free < 99%, auth failures > 2%, solver error rate > 5%, any data-exposure report.

## 6. Production infrastructure

- `infra/docker-compose.prod.yml` (digest-pinned): `caddy`, `api`, `db`, `routing` (road engine + solver). DB/routing on internal network only (C1).
- Deploy: GH Actions → SSH (deploy key, restricted) → `docker compose pull && docker compose up -d --remove-orphans`, healthcheck gate, auto-rollback to previous image tag on failure.
- Migrations: run as separate step **after** backup; expand/contract pattern (backward-compatible with previous app version).
- Config: `/srv/flex/prod/.env` 0600; secrets rotated quarterly.
- Capacity (measure at T-825): solver CPU-bound — queue + concurrency limit; per-user rate limits; Gemini quota alarms.
- DR: RPO 24 h (nightly dump), RTO 4 h (documented rebuild from compose + backup); restore drill monthly.

## 7. Rollback

| Layer | Rollback |
|---|---|
| API/infra | redeploy previous digest (`infra/rollback.sh <tag>`), DB: restore only if migration destructive (shouldn't be) |
| JS-only mobile bug | `eas update --channel production --branch <previous>` / republish |
| Native/store bug | halt staged rollout; ship hotfix; Play: halt rollout; Apple: pause phased release |
| Block Grabber | remote kill-switch (T-655) → disables module on next config fetch |
| Selector breakage | push fixed selector JSON (signed) |

## 8. Go/No-Go (owner sign-off)

Orchestrator compiles: checklist status, open issues by severity, perf/eval numbers, risk register delta, rollback readiness. Owner decides. Store submission and prod deploy happen only after explicit approval.

## 9. Launch day

T-1: freeze, final smoke on release build, support macros ready. T0: release → verify stores/OTA/`/healthz` → owner posts per [06 §R6](06-reddit-workflow.md) → monitoring watch (dashboard open, 6 h). T+1: review crash/feedback, decide rollout advance.
