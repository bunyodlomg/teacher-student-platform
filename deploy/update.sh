#!/usr/bin/env bash
# Cambridge Learn — yangilash skripti (VPS ichida ishlatiladi)
# Ishlatish:  cd /var/www/cambridge-learn && ./deploy/update.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Git'dan oxirgi o'zgarishlar olinmoqda..."
git pull origin main

echo "==> Paketlar o'rnatilmoqda..."
npm install   # build uchun devDependencies ham kerak (tsx, tailwind) — default o'rnatadi

echo "==> Production build..."
npm run build

echo "==> Servis qayta ishga tushirilmoqda..."
sudo systemctl restart cambridge-learn

echo "==> Tayyor. Holat:"
sudo systemctl status cambridge-learn --no-pager -l | head -n 12
