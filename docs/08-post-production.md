# 08 — Post-Production

## 1. Monitoring (T-980)

| Signal | Tool | Alert threshold | Action |
|---|---|---|---|
| App crashes/ANR | Sentry + Play Vitals / Xcode Organizer | crash-free < 99.5%, ANR > 0.5% | Triage < 4 h; halt rollout if < 99% |
| API errors/latency | Sentry + Caddy logs + uptime monitor | 5xx > 1% / 5 min; p95 > 600 ms | Page owner; check deploy/DB |
| Uptime | external ping on `/healthz` | 2 failures | Page |
| Solver | API metrics (duration, infeasible rate, errors) | error > 5%, p95 > 10 s | Scale/limit; investigate payloads |
| OCR quality | in-app "this was wrong" tap rate, edit rate per field | edit rate +10 pts WoW | Re-run eval; prompt/model drift check |
| Gemini cost | Google Cloud billing alert | > 80% of monthly budget | Throttle, push on-device path |
| Infra | disk, RAM, CPU, container restarts | disk > 80%, RAM > 85% | Prune/scale |
| Backups | job success + age | none in 26 h | Page; run manual |
| Block Grabber (sideload) | opt-in anonymous events: enabled, accept-count, selector-miss rate | miss rate > 20% | Ship selector fix / kill-switch |
| Store ratings/reviews | store consoles | rating < 4.0 or review spike | Respond, triage |

Privacy: telemetry minimal, no addresses/names; documented in policy.

## 2. Incident response

| Sev | Definition | Response | Comms |
|---|---|---|---|
| 1 | Data exposure, API down, mass crash, Block Grabber misfires | Immediate; kill-switch/rollback first | Status note in store/Reddit/landing within 2 h |
| 2 | Major feature broken (OCR, routing) | < 4 h ack, fix < 48 h | Reddit/FAQ update |
| 3 | Minor bug | next release | Changelog |

Flow: detect → declare (issue `sev:N`) → mitigate (rollback / flag / kill-switch) → fix → verify → postmortem (blameless, `docs/postmortems/`) within 5 days with action items as tasks.

Data-exposure path: contain → assess scope → notify affected users and regulators as legally required (owner/legal) → rotate secrets → postmortem.

## 3. Support

- Channels: in-app feedback → API → GitHub issue (`src:app`), support email, Reddit ([06](06-reddit-workflow.md)), store reviews.
- Macros in `docs/support/macros.md`: login issues, OCR wrong, route infeasible, permissions, account deletion, "is this allowed by Amazon?" (answer: not affiliated, user responsibility; Block Grabber risk statement).
- SLA: first reply ≤ 24 h, resolution target by severity.
- Triage weekly: Orchestrator groups tickets → roadmap candidates.

## 4. Release & maintenance cadence

| Cadence | Work |
|---|---|
| Daily (first 2 wks) | Crash/feedback review, rollout decision |
| Weekly | Triage, patch release if needed, OTA for JS-only fixes |
| Bi-weekly | Minor release (v1.x), changelog post |
| Monthly | Dependency updates (Expo SDK patches, `npm audit`), Security audit, **backup restore drill**, cost review, rules-matrix refresh |
| Quarterly | Secret rotation, Expo SDK upgrade (CNG makes this a regenerate + test), dependency/OS API-level compliance (Play target API deadline), architecture/tech-debt review, Reddit research refresh |
| Annually | Apple/Google program renewals, privacy policy review, DR full-rebuild test |

Expo SDK upgrade playbook: branch → `npx expo install --fix` → `expo-doctor` → regenerate native (`prebuild --clean`) → full test + E2E + device smoke → preview build → staged rollout.

## 5. Block Grabber upkeep (sideload)

- Amazon UI changes are expected (R3): weekly selector-miss review; fixtures re-captured from owner's device; signed selector JSON hotfix path < 24 h.
- Kill-switch drill quarterly.
- Re-evaluate legal/ToS exposure each quarter; reserve right to retire the feature.
- Never collect users' Flex credentials or screen content off-device.

## 6. Data lifecycle

| Data | Retention | Notes |
|---|---|---|
| Account/profile | until deletion | deletion endpoint T-745 |
| Itineraries/routes | 90 days default, user-configurable | purge job |
| Raw itinerary images | not stored server-side | processed in memory |
| Logs | 14–30 days | no PII |
| Backups | 14 days rolling | encrypted |
| Analytics | aggregate only | |

## 7. Feedback → roadmap loop

Monthly: Orchestrator compiles KPIs (installs, D7/D30 retention, imports/user, routes/user, OCR edit rate, crash-free, rating, support volume, Reddit sentiment) → prioritizes (RICE) → updates `docs/roadmap.md` → owner approves → issues created.

Candidate v1.1+ ideas (unprioritized): multi-depot / multi-day, driver earnings tracker, traffic-aware ETAs, shared stop notes, iOS Shortcuts import, Wear/auto UI, additional gig platforms.

## 8. Retro (T-985)

30 days post-launch: what shipped vs plan, estimate accuracy, incident review, agent-workflow friction, risk register update, decision on Block Grabber future, v1.1 scope.

## 9. Sunset/exit criteria

Define up front: if crash-free < 98% for 2 releases, or legal/ToS pressure, or < N active users after 6 months → freeze features, security patches only, communicate on Reddit/store, offer data export.
