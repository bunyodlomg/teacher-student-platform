#!/usr/bin/env bash
# Cambridge Learn — VPS'ni noldan sozlaydigan avtomatik skript (Ubuntu 22.04 / 24.04)
# =====================================================================================
# Ishlatish (VPS'da root sifatida):
#   curl -fsSL https://raw.githubusercontent.com/bunyodlomg/teacher-student-platform/main/deploy/bootstrap.sh -o bootstrap.sh
#   sudo bash bootstrap.sh
#
# Qayta ishga tushirsa ham xavfsiz (idempotent) — mavjud narsalarni buzmaydi,
# .env bir marta yaratiladi va saqlanadi.
#
# Sozlamalarni env orqali o'zgartirish mumkin, masalan:
#   sudo CERTBOT_EMAIL="siz@mail.uz" ADMIN_PASSWORD="MahfiyParol" bash bootstrap.sh
set -euo pipefail

# ==== Sozlamalar (env orqali override qilish mumkin) ====
REPO_URL="${REPO_URL:-https://github.com/bunyodlomg/teacher-student-platform.git}"
APP_DIR="${APP_DIR:-/var/www/cambridge-learn}"
APP_USER="${APP_USER:-deploy}"
DOMAIN="${DOMAIN:-learn.cambridgeschool.uz}"
NODE_MAJOR="${NODE_MAJOR:-20}"
MONGO_VERSION="${MONGO_VERSION:-7.0}"
PORT="${PORT:-3000}"
ADMIN_NAME="${ADMIN_NAME:-Administrator}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"   # bo'sh bo'lsa tasodifiy yaratiladi
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"     # berilsa va DNS tayyor bo'lsa HTTPS o'rnatiladi

C_CYAN='\033[1;36m'; C_YEL='\033[1;33m'; C_GRN='\033[1;32m'; C_RST='\033[0m'
log()  { echo -e "\n${C_CYAN}==> $*${C_RST}"; }
warn() { echo -e "${C_YEL}[!] $*${C_RST}"; }
ok()   { echo -e "${C_GRN}[✓] $*${C_RST}"; }

if [[ $EUID -ne 0 ]]; then
  echo "Bu skript root talab qiladi. Ishlatish: sudo bash $0"
  exit 1
fi

# =====================================================================================
log "1/10 · Tizim yangilanmoqda va asosiy paketlar o'rnatilmoqda"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw build-essential gnupg ca-certificates lsb-release openssl rsync

# =====================================================================================
log "2/10 · Swap (RAM 2 GB dan kam bo'lsa) — next build OOM bo'lmasligi uchun"
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [[ "$MEM_MB" -lt 2000 ]] && ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "2 GB swap qo'shildi (RAM: ${MEM_MB} MB)"
else
  ok "Swap kerak emas yoki allaqachon bor (RAM: ${MEM_MB} MB)"
fi

# =====================================================================================
log "3/10 · Node.js ${NODE_MAJOR} o'rnatilmoqda"
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v) · npm $(npm -v)"

# =====================================================================================
log "4/10 · MongoDB ${MONGO_VERSION} o'rnatilmoqda (local, faqat 127.0.0.1)"
if ! command -v mongod >/dev/null; then
  . /etc/os-release
  CODENAME="${UBUNTU_CODENAME:-jammy}"
  case "$CODENAME" in
    focal|jammy|noble) : ;;   # MongoDB qo'llab-quvvatlaydi
    *) warn "Noma'lum Ubuntu kodnomi '$CODENAME' — 'jammy' repo ishlatiladi"; CODENAME="jammy" ;;
  esac
  ARCH="$(dpkg --print-architecture)"
  curl -fsSL "https://pgp.mongodb.com/server-${MONGO_VERSION}.asc" \
    | gpg -o "/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg" --dearmor --yes
  echo "deb [ arch=${ARCH} signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" \
    > "/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"
  apt-get update -y
  apt-get install -y mongodb-org
fi
systemctl enable --now mongod
ok "MongoDB ishlayapti"

# =====================================================================================
log "5/10 · '${APP_USER}' foydalanuvchisi va papka tayyorlanmoqda"
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
fi
mkdir -p "$(dirname "$APP_DIR")"
ok "Foydalanuvchi tayyor"

# =====================================================================================
log "6/10 · Loyiha GitHub'dan olinmoqda"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" -H git -C "$APP_DIR" pull origin main
else
  if ! sudo -u "$APP_USER" -H git clone "$REPO_URL" "$APP_DIR"; then
    warn "Clone muvaffaqiyatsiz. Agar repo PRIVATE bo'lsa, deploy key qo'shing:"
    warn "  sudo -u ${APP_USER} ssh-keygen -t ed25519 -f /home/${APP_USER}/.ssh/id_ed25519 -N ''"
    warn "  cat /home/${APP_USER}/.ssh/id_ed25519.pub  → GitHub repo → Settings → Deploy keys"
    warn "  keyin REPO_URL=git@github.com:bunyodlomg/teacher-student-platform.git bilan qayta ishga tushiring"
    exit 1
  fi
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# =====================================================================================
log "7/10 · .env sozlanmoqda"
if [[ -f "$APP_DIR/.env" ]]; then
  ok ".env allaqachon mavjud — o'zgartirilmadi"
else
  JWT_SECRET="$(openssl rand -hex 48)"
  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
    GEN_PW=1
  fi
  cat > "$APP_DIR/.env" <<ENV
MONGODB_URI="mongodb://127.0.0.1:27017/cambridge-learn"
JWT_SECRET="${JWT_SECRET}"
ADMIN_NAME="${ADMIN_NAME}"
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
PORT=${PORT}
ENV
  chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  ok ".env yaratildi (JWT_SECRET avtomatik generatsiya qilindi)"
fi

# =====================================================================================
log "8/10 · npm install · seed · build"
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && npm install"
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && npm run db:seed" || warn "seed o'tkazib yuborildi (admin allaqachon bor bo'lishi mumkin)"
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && npm run build"
ok "Build tayyor"

# =====================================================================================
log "9/10 · systemd servisi o'rnatilmoqda"
NPM_BIN="$(command -v npm)"
cat > /etc/systemd/system/cambridge-learn.service <<UNIT
[Unit]
Description=Cambridge Learn (Next.js + Socket.IO)
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
ExecStart=${NPM_BIN} start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cambridge-learn
systemctl restart cambridge-learn
ok "Servis ishga tushdi (journalctl -u cambridge-learn -f)"

# =====================================================================================
log "10/10 · Nginx reverse proxy sozlanmoqda"
apt-get install -y nginx
# Repo'dagi config'dan foydalanamiz, server_name ni DOMAIN ga moslaymiz
sed "s/server_name .*/server_name ${DOMAIN};/" "$APP_DIR/deploy/nginx.conf" \
  > /etc/nginx/sites-available/cambridge-learn
ln -sf /etc/nginx/sites-available/cambridge-learn /etc/nginx/sites-enabled/cambridge-learn
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx tayyor"

# Firewall
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

# =====================================================================================
# HTTPS — faqat DNS shu serverga ishorat qilsa (bekorga rate-limit sarflamaslik uchun)
if [[ -n "$CERTBOT_EMAIL" ]]; then
  log "HTTPS · Let's Encrypt tekshirilmoqda"
  SERVER_IP="$(curl -fsS4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)"
  if [[ -n "$DOMAIN_IP" && "$DOMAIN_IP" == "$SERVER_IP" ]]; then
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect || \
      warn "certbot xato berdi — keyinroq qo'lda: sudo certbot --nginx -d ${DOMAIN}"
  else
    warn "DNS hali ${DOMAIN} → ${SERVER_IP} ga ishorat qilmayapti (hozir: ${DOMAIN_IP:-aniqlanmadi})."
    warn "DNS tarqalgach qo'lda ishga tushiring: sudo certbot --nginx -d ${DOMAIN}"
  fi
else
  warn "CERTBOT_EMAIL berilmadi — HTTPS o'tkazib yuborildi."
  warn "DNS tayyor bo'lgach:  sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d ${DOMAIN}"
fi

# =====================================================================================
echo -e "\n${C_GRN}================ TAYYOR ================${C_RST}"
echo -e "Sayt:      http://${DOMAIN}  (DNS tayyor bo'lsa)"
echo -e "Server IP: $(curl -fsS4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo -e "DNS:       A-record  →  'learn'  →  yuqoridagi IP  (Eskiz panelida)"
echo -e "Servis:    systemctl status cambridge-learn | journalctl -u cambridge-learn -f"
echo -e "Yangilash: cd ${APP_DIR} && ./deploy/update.sh"
if [[ "${GEN_PW:-0}" == "1" ]]; then
  echo -e "\n${C_YEL}Admin login: ${ADMIN_EMAIL}${C_RST}"
  echo -e "${C_YEL}Admin parol: ${ADMIN_PASSWORD}${C_RST}   ← saqlab qo'ying! (.env ichida ham bor)"
fi
echo -e "${C_GRN}=======================================${C_RST}"
