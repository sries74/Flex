# Phase 1 — Environment Runbook (T-100 … T-107)

Scripts do what can be automated; items marked **YOU** need your hands (accounts, installers, keys).

| Task | How | Who | Verify |
|---|---|---|---|
| T-100 WSL toolchain | `bash scripts/wsl-setup.sh` | YOU run | `node -v`, `java -version` |
| T-101 EAS login | `eas login` | YOU | `eas whoami` |
| T-102 Android Studio + AVD | Install on Windows; SDK Manager: API 35, Platform-Tools, Emulator, Cmd-line tools; AVD "Pixel_API35" | YOU | emulator boots |
| T-103 adb bridge | PowerShell: `adb kill-server; adb -a nodaemon server start`; firewall allow TCP 5037 (non-mirrored WSL) | YOU | `adb devices` in WSL lists emulator |
| T-104 JDK 17 | installed by `wsl-setup.sh` | script | `javac -version` |
| T-105 VPS bootstrap | copy `scripts/vps-bootstrap.sh` to VPS; run as root with `NEW_USER`, `SSH_PUBKEY` | YOU run | second SSH login works; `ufw status`; `docker compose version` |
| T-106 Accounts | see list below | YOU | creds in password manager |
| T-107 Secrets strategy | `.env.example` + rules below | done in repo | doctor "no secret files tracked" |

Final gate: `bash scripts/doctor.sh` passes (and with `API_URL=https://api.flexcop.ackgent.com` once the API is up, T-700/T-725).

## T-103 notes
- Mirrored networking (`%UserProfile%\.wslconfig` → `[wsl2]` `networkingMode=mirrored`, then `wsl --shutdown`) makes `127.0.0.1:5037` reach Windows; the script handles both modes.
- If versions of Windows `adb` and WSL `adb` differ, the server restarts constantly. Fix: use the same platform-tools version, or run `adb.exe` from WSL instead.
- Fallback: run Expo/Gradle from a Windows terminal and keep WSL for api/infra/agents.

## T-105 notes
- **Keep the root session open** until a second terminal logs in as the new user with the key.
- Script is idempotent. It disables password and root SSH login, enables ufw (22/80/443), fail2ban, unattended-upgrades, Docker (official repo), log rotation, and creates `/srv/flex/{prod,staging}`.
- DNS: point `api.`, `staging-api.` and the root of `flexcop.ackgent.com` A records at the VPS (needed for Caddy TLS in T-725).

## T-106 Accounts checklist (YOU)
- [ ] Expo account (+ `EXPO_TOKEN` for CI)
- [ ] Google Play Console ($25 one-time)
- [ ] Apple Developer ($99/yr)
- [ ] Firebase project (Auth) — Android/iOS apps registered with the bundle ID
- [ ] Google AI Studio API key (Gemini) — store on VPS only
- [ ] Sentry project (app + api)
- [ ] Reddit read-only script app on your personal account (for research tooling only)
- [ ] GitHub Actions secrets: `EXPO_TOKEN`, `SENTRY_AUTH_TOKEN`
- [ ] Password manager entries for all of the above

## T-107 Secrets rules
- `.env*` git-ignored (except `.env.example`); gitleaks runs in pre-commit and CI.
- CI: GitHub encrypted secrets. Mobile build-time: `eas secret:create` / EAS file secrets (`google-services.json`).
- VPS: `/srv/flex/<env>/.env`, `chmod 600`, owned by the deploy user.
- Gemini key only on the API server. Rotate on any suspected leak.
