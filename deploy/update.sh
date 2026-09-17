#!/usr/bin/env bash
# Cambridge Learn — yangilash skripti (VPS ichida, root sifatida ishlatiladi)
# Ishlatish:  cd /var/www/cambridge-learn && sudo bash deploy/update.sh
#
# git pull / npm / build — app egasi (deploy) nomidan bajariladi (fayl egaligi buzilmaydi),
# faqat servis restart root orqali. Shu sabab root sifatida ishga tushiring.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
APP_USER="${APP_USER:-deploy}"
SERVICE="${SERVICE:-cambridge-learn}"
# `next build` ning type-check bosqichi kichik VPS'da default heap'ga sig'maydi
# ("JavaScript heap out of memory"). Kerak bo'lsa: BUILD_MEM=4096 bash deploy/update.sh
BUILD_MEM="${BUILD_MEM:-2048}"

as_app() { sudo -u "$APP_USER" "$@"; }

# LibreOffice (headless) — Word/PowerPoint fayllarini yuklab olmasdan ko'rish
# uchun PDF'ga aylantiradi. Calibri/Cambria o'rnini bosuvchi shriftlar bilan.
install_libreoffice() {
  if command -v soffice >/dev/null; then return 0; fi
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends \
    libreoffice-writer-nogui libreoffice-impress-nogui \
    fonts-dejavu fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea \
  || apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-impress fonts-dejavu fonts-liberation
}

echo "==> LibreOffice tekshirilmoqda (hujjatlarni ko'rish uchun)..."
install_libreoffice || echo "!!! LibreOffice o'rnatilmadi — hujjatlarni ko'rish ishlamaydi" >&2

echo "==> Git'dan oxirgi o'zgarishlar olinmoqda..."
as_app git pull origin main

echo "==> Paketlar o'rnatilmoqda..."
as_app npm install

# Eski build qoldiqlari yangisi bilan aralashsa, sahifa stilsiz ochiladi
# (/_next/static/css/... → 404). Shuning uchun har safar toza build qilamiz,
# lekin eskisini zaxiraga olamiz: build yiqilsa uni qaytaramiz, aks holda
# sayt umuman ishlamay qoladi.
echo "==> Eski build zaxiraga olinmoqda..."
as_app rm -rf .next.old
if [ -d .next ]; then as_app mv .next .next.old; fi

restore_build() {
  echo "!!! Build muvaffaqiyatsiz — eski build qaytarilmoqda..." >&2
  as_app rm -rf .next
  if [ -d .next.old ]; then as_app mv .next.old .next; fi
  echo "!!! Servis eski versiyada qoldi. Log: journalctl -u ${SERVICE} -n 50" >&2
}
trap restore_build ERR

echo "==> Production build (heap ${BUILD_MEM}MB)..."
as_app env NODE_OPTIONS="--max-old-space-size=${BUILD_MEM}" npm run build

trap - ERR
as_app rm -rf .next.old

echo "==> Servis qayta ishga tushirilmoqda..."
systemctl restart "$SERVICE"

echo "==> Tayyor. Holat:"
systemctl status "$SERVICE" --no-pager -l | head -n 12
