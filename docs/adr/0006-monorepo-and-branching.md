# 0006 — Monorepo layout and branching
**Status:** Accepted

**Decision:** Single repo: `mobile/`, `api/`, `infra/`, `e2e/`, `community/`, `docs/`, `legacy/`. Trunk-based on protected `main`; short-lived `feat|fix|chore|docs/T-xxx-slug` and `claude/*` branches; squash merge; Conventional Commits. `master` is frozen legacy.

**Consequences:** One CI config with path filters; `legacy/` excluded from CI.
