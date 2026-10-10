#!/usr/bin/env bash
# T-100 / T-101 / T-103 / T-104: WSL2 (Ubuntu 24 / Debian 13) dev environment.
# Idempotent. Run inside WSL as your normal user (not root):  bash scripts/wsl-setup.sh
set -euo pipefail

NVM_VERSION="${NVM_VERSION:-v0.40.3}"
MARK_BEGIN="# >>> flexcompanion >>>"
MARK_END="# <<< flexcompanion <<<"

if [ "$(id -u)" -eq 0 ]; then
  echo "Run as your normal user, not root." >&2
  exit 1
fi

echo "==> apt packages"
sudo apt-get update -y
sudo apt-get install -y git curl build-essential unzip micro zsh \
  openjdk-17-jdk android-tools-adb ca-certificates

echo "==> nvm ${NVM_VERSION} + Node LTS"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSo- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | PROFILE=/dev/null bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install --lts
nvm alias default 'lts/*'

echo "==> EAS CLI"
npm install -g eas-cli

echo "==> Windows user + Android SDK path"
WIN_USER="${WIN_USER:-}"
if [ -z "$WIN_USER" ] && command -v cmd.exe >/dev/null 2>&1; then
  WIN_USER="$(cmd.exe /c 'echo %USERNAME%' 2>/dev/null | tr -d '\r\n')"
fi
if [ -z "$WIN_USER" ]; then
  echo "Could not detect Windows user. Re-run with WIN_USER=<name>." >&2
  exit 1
fi
ANDROID_SDK="/mnt/c/Users/${WIN_USER}/AppData/Local/Android/Sdk"
[ -d "$ANDROID_SDK" ] || echo "WARN: $ANDROID_SDK not found yet (install Android Studio first, T-102)."

echo "==> shell config block"
BLOCK=$(cat <<BLK
${MARK_BEGIN}
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
export ANDROID_HOME="${ANDROID_SDK}"
export PATH="\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools"
# adb: talk to the adb server running on Windows (C8). See docs/03-environment-setup.md
if [ "\$(wslinfo --networking-mode 2>/dev/null)" = "mirrored" ]; then
  export ADB_SERVER_SOCKET="tcp:127.0.0.1:5037"
else
  export ADB_SERVER_SOCKET="tcp:\$(ip route show default | awk '{print \$3}'):5037"
fi
${MARK_END}
BLK
)
for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
  touch "$rc"
  if grep -qF "$MARK_BEGIN" "$rc"; then
    # replace existing block
    sed -i "/$MARK_BEGIN/,/$MARK_END/d" "$rc"
  fi
  printf '\n%s\n' "$BLOCK" >> "$rc"
done

cat <<'MSG'

Done. Next:
  1. Open a new shell (or: source ~/.zshrc)
  2. eas login                       (T-101, interactive)
  3. On Windows PowerShell, start the adb server so WSL can reach it:
       adb kill-server; adb -a nodaemon server start
     and allow TCP 5037 for the WSL network in Windows Firewall (non-mirrored mode).
  4. bash scripts/doctor.sh
MSG
