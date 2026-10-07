# 03 — Environment Setup

Host: Windows 11 + PowerShell. Dev shell: WSL2 Ubuntu 24 (→ Debian 13 later; steps identical). VPS: Debian 13.

## 1. Windows 11

1. Enable WSL2, install Ubuntu 24.04.
2. Install Android Studio (Windows). SDK Manager: Platform API 35, Build-Tools, Platform-Tools, Emulator, Command-line Tools. Create AVD "Pixel_API35" (Google APIs, x86_64, HW accel on).
3. Install JDK 17 (Android Studio's JBR is fine).
4. Windows env vars: `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`; add `platform-tools` and `emulator` to PATH.
5. Optional: WSL `.wslconfig` → `networkingMode=mirrored` (simplifies adb / Metro reachability).

## 2. WSL2 (Ubuntu 24)

1. Base: `sudo apt update && sudo apt install -y git curl build-essential unzip micro zsh openjdk-17-jdk`.
2. NVM → Node LTS: install nvm, `nvm install --lts`, `nvm alias default lts/*`.
3. `npm i -g eas-cli` then `eas login`.
4. Android env in `~/.zshrc` (spec §1, with C8 fix):
   - `ANDROID_HOME=/mnt/c/Users/<user>/AppData/Local/Android/Sdk` (read-only tooling) — **use the Windows adb server, not WSL's**:
   - `export ADB_SERVER_SOCKET=tcp:$(ip route show default | awk '{print $3}'):5037` (not needed with mirrored networking → use `127.0.0.1`).
   - On Windows start once: `adb -a nodaemon server start` (PowerShell).
5. Verify: `adb devices` (WSL) lists the emulator; `node -v`; `eas whoami`.
6. Fallback if bridge is painful: run `npx expo start`/`gradlew` from Windows terminal; keep WSL for backend/infra/agents.
7. Clone to Linux FS (`~/projects/Flex`), **not** `/mnt/c` (slow file watching).

## 3. Repo bootstrap (after P0/P2)

```text
git clone git@github.com:sries74/Flex.git ~/projects/Flex && cd ~/projects/Flex
git checkout main
cd mobile && npm ci && cp .env.example .env
npx expo prebuild --platform android      # CNG: android/ is generated, git-ignored
npx expo run:android                      # dev client on emulator
```

CNG rule: `android/` and `ios/` are **generated** — never hand-edit; use config plugins. (Fastlane dirs live in `devops/`, not in generated folders — adjusts spec §8.2.)

## 4. Accounts & credentials checklist

| Service | Needed for | Store secret in |
|---|---|---|
| GitHub | repo, Actions | — |
| Expo / EAS | builds, OTA, submit | `EXPO_TOKEN` (GH secret) |
| Google Play Console ($25) | Android release | service-account JSON → EAS/GH secret |
| Apple Developer ($99/yr) | iOS release | App Store Connect API key (.p8) → EAS |
| Firebase | Auth | `google-services.json` / plist (git-ignored; EAS file secrets) |
| Google AI Studio | Gemini Vision | `GEMINI_API_KEY` (API server proxy — **not** shipped in app) |
| Sentry | crash/errors | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Reddit | community | OAuth app creds (read-only) → local `.env` |
| Domain/DNS `flexcop.ackgent.com` | landing page (root), `api.` and `staging-api.` A records → VPS | registrar/DNS host |

Gemini key must live on the API server; the app calls `POST /v1/ocr` (or uses on-device OCR). Never embed in the bundle.

## 5. VPS (Debian 13) bootstrap & hardening

1. `ssh root@<ip>` → create user `scott`, add to `sudo`, install SSH key; disable root login + password auth (`/etc/ssh/sshd_config.d/`).
2. `ufw default deny incoming; ufw allow 22,80,443/tcp; ufw enable`.
3. `fail2ban`, `unattended-upgrades`, timezone/NTP.
4. Install Docker Engine + compose plugin from Docker's apt repo; add user to `docker` group.
5. Directory layout: `/srv/flex/{prod,staging}/` each with `docker-compose.yml`, `.env` (0600), `data/`.
6. Compose rules: DB and routing **not published** to host; only Caddy publishes 80/443; healthchecks; `restart: unless-stopped`; pinned image digests (not `:latest` — adjusts spec §7.2).
7. Region OSM extract downloaded for road engine (size/RAM sized in T-530). Minimum 4 GB RAM for small region + solver; measure.
8. Backups: cron `pg_dump | age -r <pubkey> → rclone → off-box`; monthly restore drill.
9. Monitoring: uptime check on `/healthz`, disk/RAM alerts.

Example `.env.example` keys (values never committed):
`DB_PASSWORD`, `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `GEMINI_API_KEY`, `SENTRY_DSN`, `ROUTING_URL`.

## 6. Secrets handling rules

- `.env*` git-ignored; only `.env.example` committed.
- CI uses GH encrypted secrets; EAS uses `eas secret:create`.
- Keystores/`.p8` in password manager + EAS-managed; never in repo.
- Rotate on any suspected leak; GH secret scanning on.

## 7. Environment verification script (T-100..T-107 exit)

Checklist (run as a single `scripts/doctor.sh` — a task for DevOps): node/npm versions, `eas whoami`, `adb devices`, `java -version`, docker reachable on VPS, `curl https://api.flexcop.ackgent.com/healthz`. Exit non-zero on any failure.
