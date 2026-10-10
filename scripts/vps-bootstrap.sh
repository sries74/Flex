#!/usr/bin/env bash
# T-105: Debian 13 VPS bootstrap + hardening. Run as root ON THE VPS.
#   NEW_USER=scott SSH_PUBKEY="ssh-ed25519 AAAA... you@host" bash vps-bootstrap.sh
# KEEP YOUR CURRENT SSH SESSION OPEN and test a second login before closing it.
set -euo pipefail

NEW_USER="${NEW_USER:?set NEW_USER}"
SSH_PUBKEY="${SSH_PUBKEY:?set SSH_PUBKEY (public key line)}"
[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }
# shellcheck disable=SC1091
. /etc/os-release
[ "${ID}" = "debian" ] || echo "WARN: expected Debian, found ${ID} ${VERSION_ID}"

export DEBIAN_FRONTEND=noninteractive
echo "==> packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y sudo ufw fail2ban unattended-upgrades ca-certificates curl gnupg git micro

echo "==> user ${NEW_USER}"
id "$NEW_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$NEW_USER"
usermod -aG sudo "$NEW_USER"
install -d -m 700 -o "$NEW_USER" -g "$NEW_USER" "/home/${NEW_USER}/.ssh"
AK="/home/${NEW_USER}/.ssh/authorized_keys"
touch "$AK"; chmod 600 "$AK"; chown "$NEW_USER:$NEW_USER" "$AK"
grep -qF "$SSH_PUBKEY" "$AK" || echo "$SSH_PUBKEY" >> "$AK"
# passwordless sudo is convenient for automation; remove if you prefer a password
echo "${NEW_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${NEW_USER}"
chmod 440 "/etc/sudoers.d/90-${NEW_USER}"

echo "==> sshd hardening (key-only, no root)"
cat > /etc/ssh/sshd_config.d/10-flex-hardening.conf <<CONF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
CONF
sshd -t   # abort (set -e) if config invalid
systemctl reload ssh || systemctl reload sshd

echo "==> firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban + unattended-upgrades"
cat > /etc/fail2ban/jail.d/sshd.local <<CONF
[sshd]
enabled = true
maxretry = 5
bantime = 1h
CONF
systemctl enable --now fail2ban
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades
timedatectl set-ntp true || true

echo "==> Docker Engine + compose plugin (official apt repo)"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
usermod -aG docker "$NEW_USER"
# log rotation for container logs
cat > /etc/docker/daemon.json <<CONF
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
CONF
systemctl restart docker

echo "==> directories"
for env in prod staging; do
  install -d -m 750 -o "$NEW_USER" -g "$NEW_USER" "/srv/flex/${env}" "/srv/flex/${env}/data"
done

cat <<MSG

Bootstrap complete. BEFORE closing this session:
  1. In a NEW terminal:  ssh ${NEW_USER}@<vps-ip>   (must succeed with your key)
  2. Verify:  sudo ufw status; sudo fail2ban-client status sshd; docker compose version
  3. Then run  bash scripts/doctor.sh  from your dev machine with API_URL set once Caddy is up (T-725).
MSG
