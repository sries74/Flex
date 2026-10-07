# 0003 — VRPTW solver
**Status:** Provisional — finalized by spike T-530

**Context:** The source spec assumes self-hosted GraphHopper supports VRPTW. GraphHopper's route-optimization API is a commercial product; open-source GraphHopper is point-to-point routing; jsprit is a Java library. (Verify against current docs during the spike.)

**Options:** (a) VROOM + OSRM/GraphHopper matrix, (b) jsprit wrapped in a small service, (c) GraphHopper commercial API.

**Decision (provisional):** (a) VROOM, behind a thin adapter `lib/routing/solver.ts` so it can be swapped.

**Consequences:** Spike must benchmark 50 stops with time windows (latency, quality) and confirm VPS RAM/CPU needs.
