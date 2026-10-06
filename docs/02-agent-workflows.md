# 02 — Agent Workflows

Agents are Claude Code sessions/subagents with a narrow role. A human (owner) approves anything outward-facing: posting, spending, publishing, store submission, pushes to `main`.

## 1. Roster

| Agent | Mission | Owns (paths) | Tools | May NOT |
|---|---|---|---|---|
| **Orchestrator** | Triage issues, decompose, assign, track phases, run retros | `.github/`, `docs/`, project board | GitHub MCP, Read/Grep | Write product code; merge without green CI |
| **Architect** | ADRs, boundaries, schemas, API contracts | `docs/adr/`, `docs/api/` | Read/Write docs | Implement features |
| **Frontend** | Screens, components, nav, state, a11y | `mobile/app`, `mobile/components` | Edit, Bash (npm, expo), emulator | Touch `modules/`, `api/` |
| **OCR/Vision** | OCR providers, parsing, matching, eval harness | `mobile/lib/{ocr,itinerary,matching}`, `mobile/mocks/` | Edit, Bash, Gemini API (dev key) | Commit real customer data |
| **Routing** | Solver/road-engine deploy, payload builders, geocoding | `mobile/lib/routing`, `infra/routing/` | Edit, Bash, Docker, SSH (staging only) | Prod SSH without approval |
| **Native (Kotlin)** | Block Grabber module, config plugin | `mobile/modules/block-grabber/` | Edit, Gradle, adb | Add module to store builds |
| **Backend** | API, DB schema, migrations | `api/` | Edit, Bash, psql (local/staging) | Run migrations on prod unreviewed |
| **DevOps** | CI/CD, EAS, Fastlane, VPS, backups | `.github/workflows/`, `devops/`, `infra/` | Edit, Bash, SSH, EAS CLI | Store submit/prod deploy without approval |
| **QA** | Test strategy, harnesses, E2E, perf, eval gates | `**/__tests__/`, `e2e/`, `k6/` | Edit, Bash, Maestro | Skip/disable tests to get green |
| **Security** | Threat model, reviews, privacy, dependency audit | `docs/security/` | Read, Grep, scanners | Approve own changes |
| **Docs** | README, runbooks, store copy, changelog | `docs/`, `screenshots/` metadata | Edit | — |
| **Community (Reddit)** | Research, drafts, feedback triage | `community/` | Read, WebFetch, Edit, Reddit API **read-only** | Post/comment/vote/DM (human only) |

Optional mapping: each row can be a `githubclip` persona (SOUL.md + TOOLS.md + config.yaml) driven by the heartbeat skill, labelled `agent:<name>` on issues.

## 2. Handoff contract

Every agent hand-off is a GitHub issue/PR comment containing:

```
Task: T-xxx
State: done | blocked | needs-review
Changed: <paths>
Verified: <exact commands run + result>
Open questions: <…>
Next agent: <role>
```

## 3. Per-task loop (all code agents)

1. **Claim**: assign issue, set `in-progress`, branch `feat/T-xxx-slug` from latest `main`.
2. **Read context**: `PROJECT-INFO.md`, relevant ADRs, task row in [01](01-master-task-list.md).
3. **Plan**: ≤ 10 lines in the issue; list files and tests.
4. **RED**: write failing test(s) (see [04](04-testing-setup.md)); run; confirm they fail for the right reason.
5. **GREEN**: minimal implementation; run tests.
6. **REFACTOR**: tidy; `npm run lint && npm run typecheck && npm test`.
7. **Self-review** diff adversarially: what would CI reject? secrets? PII in fixtures?
8. **PR** (draft → ready): template filled, "Done when" evidence pasted, screenshots for UI.
9. **Review**: Code-review + (Security agent if auth/PII/native/infra). Fix blockers.
10. **CI green** on latest head → human merges (squash). Never skip/disable tests.
11. **Close**: update task status; Orchestrator checks dependents.

## 4. Role-specific playbooks

### Frontend
- Build against mocks in `mobile/mocks/`; no live API in unit tests.
- Every screen: loading / empty / error / success states + a11y labels.
- Run on emulator before PR; attach screenshot.

### OCR/Vision
- Provider interface first; providers swappable and unit-testable with recorded responses.
- Prompts versioned in `lib/ocr/prompts/`; schema-constrained JSON output; temperature 0.
- Eval harness gates merges that touch prompts/models. Report precision/recall per field.
- Fixtures synthetic or redacted only (T-410).

### Routing
- Spike → ADR → deploy. Keep solver behind a thin adapter (`lib/routing/solver.ts`) so it can be swapped.
- Always return `violations[]`; never silently drop stops.
- Capture real response JSON into `mocks/routing/` for contract tests.

### Native (Kotlin)
- Pure logic (selectors, parser, filters) in plain Kotlin → JVM unit tests on captured fixtures.
- Service only wires events → logic → dispatcher. Rate-limit + jitter + daily cap + kill-switch mandatory.
- CI asserts store-flavor manifest contains no accessibility service.

### Backend
- Migration up **and** down tested; no destructive migration without backup note.
- Every endpoint: authz test (other user's data → 403/404).

### DevOps
- Infra as code only; no manual prod edits. Staging first, then prod with approval.
- Rollback command documented per deploy step.

### QA
- Owns the pyramid and eval gates; flaky test → root-cause, never skip. Maintains `docs/qa/test-matrix.md` (devices × OS).

### Security
- Checklist per PR touching: auth, storage, network, native, infra, Gemini calls (PII).
- Monthly dependency + secret audit.

### Community (Reddit)
- See [06](06-reddit-workflow.md). Drafts only; human posts.

## 5. Parallelization map

| Parallel stream | Agents | Sync point |
|---|---|---|
| UI shell + auth | Frontend | P3 exit |
| OCR + matching | OCR, QA | schema T-405 |
| Solver + engine | Routing, DevOps | ADR T-530 |
| API + DB | Backend, DevOps | OpenAPI T-715 |
| Block Grabber | Native, Security | ADR T-600 |
| Community prep | Community | beta T-960 |

Use isolated git worktrees per agent to avoid clobbering; Orchestrator resolves cross-stream conflicts at sync points (merge `main` into branch, never rewrite others' history).

## 6. Guardrails (all agents)

- Never commit secrets, keystores, `google-services.json`, real itineraries/addresses.
- Never run destructive commands (`rm -rf`, `DROP`, force-push, `docker volume rm`) without explicit human OK.
- Never post to Reddit/GitHub issues of third parties/stores on the owner's behalf without approval.
- Prod SSH, store submit, `main` merge, spend > $10 → human approval.
- Report faithfully: failing tests are reported with output, skipped steps are called out.

## 7. Cadence

| Event | Who | Output |
|---|---|---|
| Daily | Orchestrator | Board sweep, blockers list |
| Weekly | Orchestrator + owner | Phase status, risk review, re-plan |
| Phase exit | QA + Security | Exit checklist signed |
| Release | DevOps + owner | Release checklist ([07](07-production.md)) |
| Monthly | Security, DevOps | Audit, dependency bump, restore drill |
