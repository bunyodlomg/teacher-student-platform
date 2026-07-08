#!/usr/bin/env bash
# Cambridge Learn — yangilash skripti (VPS ichida, root sifatida ishlatiladi)
# Ishlatish:  cd /var/www/cambridge-learn && sudo bash deploy/update.sh
#
# git pull / npm / build — app egasi (deploy) nomidan bajariladi (fayl egaligi buzilmaydi),
# faqat servis restart root orqali. Shu sabab root sifatida ishga tushiring.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_USER="${APP_USER:-deploy}"
SERVICE="${SERVICE:-cambridge-learn}"

echo "==> Git'dan oxirgi o'zgarishlar olinmoqda..."
sudo -u "$APP_USER" git pull origin main

echo "==> Paketlar o'rnatilmoqda..."
sudo -u "$APP_USER" npm install

echo "==> Production build..."
sudo -u "$APP_USER" npm run build

echo "==> Servis qayta ishga tushirilmoqda..."
systemctl restart "$SERVICE"

echo "==> Tayyor. Holat:"
systemctl status "$SERVICE" --no-pager -l | head -n 12
