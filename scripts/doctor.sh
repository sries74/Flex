#!/usr/bin/env bash
# Environment verification (T-100..T-107 exit). Exit non-zero if any required check fails.
#   bash scripts/doctor.sh                 # local checks
#   API_URL=https://api.flexcop.ackgent.com bash scripts/doctor.sh
# shellcheck disable=SC2015
set -uo pipefail

fail=0
ok()   { printf '  [ ok ] %s\n' "$1"; }
bad()  { printf '  [FAIL] %s\n' "$1"; fail=1; }
warn() { printf '  [warn] %s\n' "$1"; }

check_cmd() { # name, command, [required=1]
  local name="$1" cmd="$2" req="${3:-1}" out
  if out=$(eval "$cmd" 2>&1 | head -1) && [ -n "$out" ]; then
    ok "$name: $out"
  elif [ "$req" = 1 ]; then bad "$name"; else warn "$name not available"; fi
}

echo "Toolchain"
check_cmd "git"   "git --version"
check_cmd "node"  "node -v"
check_cmd "npm"   "npm -v"
check_cmd "java"  "java -version 2>&1 | grep -i version | head -1"
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 20 ] && ok "node >= 20" || bad "node >= 20 required (found $major)"
fi

echo "Expo / EAS"
check_cmd "eas-cli" "eas --version"
if command -v eas >/dev/null 2>&1; then
  who=$(eas whoami 2>/dev/null | head -1)
  [ -n "$who" ] && ok "eas whoami: $who" || bad "eas not logged in (run: eas login)"
fi

echo "Android"
[ -n "${ANDROID_HOME:-}" ] && [ -d "${ANDROID_HOME}" ] && ok "ANDROID_HOME=$ANDROID_HOME" || bad "ANDROID_HOME unset or missing"
if command -v adb >/dev/null 2>&1; then
  devs=$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device"{n++} END{print n+0}')
  [ "$devs" -ge 1 ] && ok "adb sees $devs device(s)/emulator(s)" || bad "adb sees no devices (start emulator / Windows adb server)"
else
  bad "adb not installed"
fi

echo "Secrets hygiene"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E '(^|/)(\.env($|\.)|google-services\.json$|GoogleService-Info\.plist$|.*\.(p8|p12|jks|keystore)$)' | grep -v '\.env\.example$' || true)
  [ -z "$tracked" ] && ok "no secret files tracked" || bad "secret-looking files tracked: $tracked"
fi

if [ -n "${API_URL:-}" ]; then
  echo "Backend"
  code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "${API_URL%/}/healthz" || true)
  [ "$code" = "200" ] && ok "GET /healthz -> 200" || bad "GET ${API_URL%/}/healthz -> ${code:-none}"
fi

echo
[ "$fail" -eq 0 ] && echo "doctor: all required checks passed" || echo "doctor: FAILURES above"
exit "$fail"
