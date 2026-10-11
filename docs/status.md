# Project Status

Updated each time a phase PR merges. Task IDs refer to [01-master-task-list.md](01-master-task-list.md).

| Phase | State | Notes |
|---|---|---|
| P0 Repo & governance | Done except T-005 (labels/issues) | `main` is default and protected (confirmed by owner) |
| P1 Environment | Tooling done; **owner steps pending** | WSL/VPS/accounts — [runbook](runbooks/phase1-environment.md) |
| P2 Project init | Done | [runbook](runbooks/phase2-mobile-setup.md) |
| P3 UI shell & auth | Done except Google sign-in (T-230b), icons | Needs Firebase project — [runbook](runbooks/phase3-ui-auth.md) |
| P4 Core logistics | **Parts 1–2 done** (logic + itinerary import/review UI) | [logic](runbooks/phase4a-core-logic.md), [UI](runbooks/phase4b-itinerary-ui.md) — camera, maps, geocoding, solver, real-data eval still open |
| P5 Block Grabber | Not started | Sideload-only (ADR 0002) |
| P6 Backend & infra | **Part 1 done** (API service, schema, auth, OCR proxy) | [runbook](runbooks/phase6a-api.md) — Dockerfile/Compose/Caddy/backups/staging still open |
| P7–P9 | Not started | |

Nothing has yet been run on a device or emulator, and no real Firebase project, Gemini key, or solver is connected.
