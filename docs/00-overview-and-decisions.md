# 00 — Overview, Architecture, Decisions, Risks

## 1. Product

**FlexCompanion**: mobile companion for gig delivery drivers (Amazon Flex).

| Feature | Platform | Spec § |
|---|---|---|
| Itinerary OCR import (screenshot → stops) | iOS + Android | 5.1 |
| Live camera package sorting (label ↔ stop match) | iOS + Android | 5.2 |
| Route optimization with time windows (VRPTW) + map | iOS + Android | 5.3 |
| Block Grabber (AccessibilityService, auto-accept by min pay) | Android only | 6 |
| Auth, user data, route history | Backend | 4, 7 |

## 2. Target architecture

```
 Expo app (RN/TS, Expo Router, NativeWind)
   ├─ lib/ocr ──► Gemini Vision (cloud) | ML Kit/Tesseract (on-device fallback)
   ├─ lib/api ──► HTTPS ──► API service (Node/Fastify, verifies Firebase ID token)
   │                          ├─ PostgreSQL + pgvector  (users, itineraries, route history)
   │                          └─ Routing service ──► solver (VRPTW) + road engine
   └─ native/block-grabber (Kotlin, Expo Module, Android only)
 VPS (Debian 13, Docker Compose, Caddy TLS, private network between containers)
 CI/CD: GitHub Actions → EAS Build/Submit (+ Fastlane for store metadata)
```

## 3. Corrections to the source spec (must be resolved before the related task)

| # | Spec says | Problem | Decision |
|---|---|---|---|
| C1 | Postgres `ports: 5432:5432` | Exposes DB to the internet | Bind `127.0.0.1` / internal Docker network only; app never talks to DB directly |
| C2 | Firebase Auth + Postgres, no API | No server to verify tokens or mediate DB | Add **API service** (T-700) verifying Firebase ID tokens |
| C3 | "Self-hosted GraphHopper VRPTW" | GraphHopper OSS = point-to-point routing; the VRP/route-optimization endpoint is commercial. jsprit is a library, not a server | **Spike T-530**: (a) VROOM + OSRM/GraphHopper matrix [preferred], (b) jsprit wrapper service, (c) GH commercial API. Verify current state in docs first |
| C4 | Vitest + `@testing-library/react-native` | RN component tests are best supported by `jest-expo`; Vitest struggles with RN transforms | **Jest (jest-expo)** for components/screens; **Vitest** for pure `lib/` logic and `api/` |
| C5 | `npx tailwindcss init` + NativeWind | NativeWind v4 needs Tailwind 3.x + babel preset + metro config + `global.css`; v5 differs | Pin versions in T-130 after checking current NativeWind docs (Context7) |
| C6 | `npx expo-module create native-block-grabber` | Current CLI is `npx create-expo-module@latest` | Use that, local-module mode (`modules/`) |
| C7 | `eas build --platform all --local` | iOS cannot build locally on Windows/WSL | Android: local or cloud. iOS: **EAS cloud** (or macOS runner) |
| C8 | ANDROID_HOME → Windows SDK from WSL | WSL2 adb cannot see Windows emulator by default | Run adb server on Windows, `ADB_SERVER_SOCKET=tcp:<winhost>:5037`, or use WSL mirrored networking; or develop RN in Windows terminal |
| C9 | Fastlane **and** EAS | Overlap | EAS Build + EAS Submit for binaries; Fastlane only for `deliver`/`supply` metadata & screenshots |
| C10 | "Ubuntu VPS" | User runs Debian 13 VPSs | Target Debian 13 |
| C11 | Gemini Vision for itineraries | Itineraries contain customer addresses (PII) | Privacy design in T-410: minimize, redact, no raw image retention, disclosure in policy |
| C12 | `micro` for editing | Fine locally; agents use file tools | No change; note only |

## 4. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Amazon Flex ToS prohibits automation**; Block Grabber can get a driver's account deactivated | High | High (users) | Ship Block Grabber as **opt-in, Android sideload flavor only**, off by default, explicit risk disclosure + consent screen. Not in store builds, not promoted as a store feature |
| R2 | **Google Play restricts AccessibilityService** to accessibility use; auto-tapping another app = rejection/removal | High | High | Store build excludes the module (R1). Config plugin gated by `FLEX_VARIANT=sideload` |
| R3 | Amazon changes Flex UI → node IDs break grabber | High | Med | Selectors in remote-updatable JSON, fixture-based tests from captured node trees, kill-switch |
| R4 | Gemini cost/latency/PII | Med | Med | On-device OCR first pass, cap cloud calls, redact, budget alerts |
| R5 | Reddit self-promotion bans / astroturfing | Med | Med | [06](06-reddit-workflow.md): disclosed, human-posted, rule-checked |
| R6 | Camera frame scanning perf on low-end Android | Med | Med | Throttle to ~2–4 fps, on-device ML Kit, perf budget in T-430 |
| R7 | VRPTW infeasible with tight windows | Med | Med | Return partial route + violations list, never fail silently |
| R8 | Secrets leak (DB password, API keys) | Low | High | `.env` never committed, GH secret scanning, EAS secrets |
| R9 | Single VPS = SPOF | Med | Med | Nightly `pg_dump` off-box, restore drill, uptime monitor |
| R10 | iOS review rejection | Med | Med | Guideline 5.1.1 privacy labels, 4.2 minimum functionality, demo account in review notes |

## 5. Open decisions (need owner input; defaults in bold applied until answered)

1. Block Grabber distribution: **sideload-only flavor** vs. drop the feature.
2. Solver: **VROOM** vs jsprit wrapper vs GH commercial.
3. OCR: **Gemini Vision w/ ML Kit fallback** vs Tesseract only.
4. Monetization: **free beta → freemium** (undecided; affects Reddit copy).
5. Reddit account: **dedicated, disclosed brand account** vs personal.
6. Domain / app name / bundle IDs: **`com.flexcompanion.app`** placeholder.

## 6. Out of scope (v1)

Web app, non-Flex gig platforms, in-app payments, social features.
