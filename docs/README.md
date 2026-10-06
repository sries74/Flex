# FlexCompanion — Master Plan Index

Source spec: Google Doc "FlexCompanion: End-to-End Development & Deployment Workflow" (snapshot of its content is folded into these docs; deviations are listed in [00](00-overview-and-decisions.md)).

| # | Doc | Purpose |
|---|-----|---------|
| 00 | [Overview & decisions](00-overview-and-decisions.md) | Scope, architecture, spec corrections, risks, open decisions |
| 01 | [Master task list](01-master-task-list.md) | Every task, phased, with owner agent, deps, acceptance criteria |
| 02 | [Agent workflows](02-agent-workflows.md) | Agent roster, handoffs, per-task loop, guardrails |
| 03 | [Environment setup](03-environment-setup.md) | Windows 11 / WSL2 / VPS / accounts / secrets |
| 04 | [Testing setup](04-testing-setup.md) | TDD loop, pyramid, mocks, CI gates |
| 05 | [Development setup](05-development-setup.md) | Repo layout, branching, conventions, feature build order |
| 06 | [Reddit workflow](06-reddit-workflow.md) | Research, beta recruitment, feedback intake, launch |
| 07 | [Production](07-production.md) | Build, sign, release, rollout, infra hardening |
| 08 | [Post-production](08-post-production.md) | Monitoring, support, updates, maintenance cadence |

Root context file for agents: [`/PROJECT-INFO.md`](../PROJECT-INFO.md).

## Branching

- `main` — protected, release-ready. Created from `master` (legacy Python bot history preserved).
- `master` — legacy; frozen, kept for reference only.
- `feat/*`, `fix/*`, `chore/*` — short-lived, PR into `main`.
- `claude/*` — agent-session branches, PR into `main`.
