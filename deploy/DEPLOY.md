# Cambridge Learn — VPS'ga deploy qilish (Ubuntu 22.04/24.04)

Bu qo'llanma: GitHub'dan loyihani Eskiz VPS'ga o'rnatish, local MongoDB, Nginx reverse proxy va domain + HTTPS.

Domain: **`learn.cambridgeschool.uz`** (asosiy `cambridgeschool.uz` band, shuning uchun subdomain).

Quyidagi joy-egallovchilarni almashtiring:
- `VPS_IP` → VPS ip manzili
- GitHub repo URL → `git@github.com:USER/REPO.git` yoki `https://github.com/USER/REPO.git`

---

## ⚡ Tez yo'l — bitta buyruq bilan avtomatik (tavsiya etiladi)

Yangi Ubuntu VPS'da root sifatida (public repo uchun). Skript hammasini qiladi:
paketlar, swap, Node, MongoDB, clone, `.env` (JWT avtomatik), build, systemd, Nginx, firewall.

```bash
curl -fsSL https://raw.githubusercontent.com/bunyodlomg/teacher-student-platform/main/deploy/bootstrap.sh -o bootstrap.sh
sudo bash bootstrap.sh
```

DNS allaqachon tayyor bo'lsa, SSL ham avtomatik o'rnatiladi — email bering:
```bash
sudo CERTBOT_EMAIL="siz@mail.uz" bash bootstrap.sh
```

Admin parolni o'zingiz belgilamoqchi bo'lsangiz:
```bash
sudo ADMIN_PASSWORD="KuchliParol123" CERTBOT_EMAIL="siz@mail.uz" bash bootstrap.sh
```

> Skript **idempotent** — qayta ishga tushirsangiz buzilmaydi (`.env` saqlanadi).
> Yakunida server IP va (avtomatik yaratilgan bo'lsa) admin parol chiqadi.
> Repo **private** bo'lsa — skript deploy key qanday qo'shishni ko'rsatadi.

Keyingi yangilanishlar: `cd /var/www/cambridge-learn && ./deploy/update.sh`

Pastdagi qo'lda bosqichlar — nima bo'layotganini tushunish yoki muammoni hal qilish uchun.

---

## 0. VPS'ga ulanish

```bash
ssh root@VPS_IP
```

> Eskiz sizga `root` parolini yoki SSH kalitini bergan bo'ladi.

---

## 1. Tizimni yangilash va asosiy paketlar

```bash
apt update && apt upgrade -y
apt install -y curl git ufw build-essential
```

### Firewall (ixtiyoriy, lekin tavsiya etiladi)
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 2. Deploy foydalanuvchisi (root'da ishlatmaslik uchun)

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
# root'siz sudo ishlashi uchun (parol so'ramasin — ixtiyoriy):
echo 'deploy ALL=(ALL) NOPASSWD:ALL' | tee /etc/sudoers.d/deploy
# SSH kalitni ko'chirish (agar root'ga kalit bilan kirgan bo'lsangiz):
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
su - deploy
```

Endi `deploy` foydalanuvchisi sifatida davom etamiz.

---

## 3. Node.js 20 (LTS) o'rnatish

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x bo'lishi kerak
npm -v
```

---

## 4. MongoDB 7 o'rnatish (VPS ichida — local)

```bash
# GPG kalit
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Repo (Ubuntu 22.04 = jammy, 24.04 = noble — o'z versiyangizga qarab)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager   # active (running) bo'lsin
```

> **Ubuntu 24.04 (noble)** bo'lsa yuqoridagi qatorda `jammy` o'rniga `noble` yozing.
> MongoDB local'da faqat `127.0.0.1` da tinglaydi — tashqaridan ochiq emas, xavfsiz.

---

## 5. Loyihani GitHub'dan olish

```bash
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www

# Public repo bo'lsa:
git clone https://github.com/USER/REPO.git cambridge-learn
# Private repo bo'lsa — SSH kalit yoki Personal Access Token ishlating (pastda "Private repo" bo'limi).

cd cambridge-learn
```

### Private repo bo'lsa (deploy key)
```bash
ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
# ↑ chiqgan kalitni GitHub → repo → Settings → Deploy keys → Add deploy key ga qo'shing.
# Keyin:  git clone git@github.com:USER/REPO.git cambridge-learn
```

---

## 6. Muhit o'zgaruvchilari (.env)

```bash
cd /var/www/cambridge-learn
cp .env.example .env
nano .env
```

To'ldiring:
```env
MONGODB_URI="mongodb://127.0.0.1:27017/cambridge-learn"
JWT_SECRET="<uzun tasodifiy satr — pastdagi buyruq bilan yarating>"
ADMIN_NAME="Administrator"
ADMIN_EMAIL="admin"
ADMIN_PASSWORD="<kuchli parol>"
PORT=3000
# Ixtiyoriy — ota-onalarga test natijasini yuborish (BotFather tokeni)
TELEGRAM_BOT_TOKEN=""
```

Kuchli `JWT_SECRET` yaratish:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 7. O'rnatish, seed, build

> **RAM 2 GB dan kam bo'lsa** `next build` xotira yetmay uzilishi mumkin. Avval swap qo'shing:
> ```bash
> sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
> sudo mkswap /swapfile && sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

```bash
cd /var/www/cambridge-learn
npm install
npm run db:seed    # bootstrap admin yaratadi
npm run build
```

Sinov (ishlayaptimi tekshirish):
```bash
npm start
# Boshqa terminalda:  curl -I http://127.0.0.1:3000
# OK bo'lsa Ctrl+C bilan to'xtating.
```

---

## 8. systemd servis (avtomatik ishga tushish + qayta tiklash)

```bash
sudo cp /var/www/cambridge-learn/deploy/cambridge-learn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cambridge-learn
sudo systemctl status cambridge-learn --no-pager
# Loglar:
journalctl -u cambridge-learn -f
```

> Servis fayli `User=deploy` va `WorkingDirectory=/var/www/cambridge-learn` deb yozilgan — moslashtiring.

---

## 9. Nginx reverse proxy

```bash
sudo apt install -y nginx

# Config'ni ko'chiring va domenni yozing:
sudo cp /var/www/cambridge-learn/deploy/nginx.conf /etc/nginx/sites-available/cambridge-learn
# nginx.conf allaqachon learn.cambridgeschool.uz ga sozlangan — o'zgartirish shart emas.

sudo ln -s /etc/nginx/sites-available/cambridge-learn /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # standart sahifani o'chirish

sudo nginx -t          # sintaksis tekshiruvi
sudo systemctl reload nginx
```

Endi `http://learn.cambridgeschool.uz` ishlashi kerak (DNS tayyor bo'lsa).

---

## 10. Subdomainni ulash (DNS — Eskiz/hosting paneli)

Asosiy `cambridgeschool.uz` band bo'lgani uchun faqat **bitta subdomain A-record** qo'shamiz — asosiy domenning mavjud yozuvlariga **tegilmaydi**.

Domain provayder panelida (Eskiz / DNS boshqaruvi) qo'shing:

| Turi | Nomi (Host) | Qiymati  |
|------|-------------|----------|
| A    | `learn`     | `VPS_IP` |

> "Nomi/Host" maydoniga to'liq `learn.cambridgeschool.uz` emas, faqat **`learn`** yozing (panel qolganini avtomatik qo'shadi). Agar panel to'liq nom so'rasa — `learn.cambridgeschool.uz`.

DNS tarqalishi 5 daqiqadan bir necha soatgacha vaqt olishi mumkin. Tekshirish:
```bash
dig +short learn.cambridgeschool.uz    # VPS_IP chiqishi kerak
```

---

## 11. HTTPS (Let's Encrypt — bepul SSL)

DNS subdomainni VPS_IP ga ishorat qilgach:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d learn.cambridgeschool.uz
```

Certbot avtomatik ravishda Nginx config'ini HTTPS'ga sozlaydi va 80→443 redirect qo'shadi. Sertifikat avtomatik yangilanadi (`certbot.timer`).

Tekshirish: `https://learn.cambridgeschool.uz` 🔒

---

## 12. Keyingi yangilanishlar (deploy)

Kod o'zgarganda VPS'da (birinchi marta skriptni bajariladigan qiling):
```bash
cd /var/www/cambridge-learn
chmod +x deploy/update.sh   # faqat bir marta
./deploy/update.sh
```

Bu: `git pull` → `npm install` → `npm run build` → servisni restart qiladi.

---

## Foydali buyruqlar

| Maqsad | Buyruq |
|--------|--------|
| Servis holati | `sudo systemctl status cambridge-learn` |
| Loglarni ko'rish | `journalctl -u cambridge-learn -f` |
| Servisni restart | `sudo systemctl restart cambridge-learn` |
| Nginx qayta yuklash | `sudo systemctl reload nginx` |
| Nginx test | `sudo nginx -t` |
| MongoDB holati | `sudo systemctl status mongod` |
| SSL yangilash testi | `sudo certbot renew --dry-run` |

---

## Muammolarni bartaraf etish

- **502 Bad Gateway** → app ishlamayapti. `journalctl -u cambridge-learn -f` ni tekshiring; `.env` bor-yo'qligi, MongoDB ishlayotganini ko'ring.
- **WebSocket ulanmayapti** → Nginx config'da `Upgrade`/`Connection` sarlavhalari bor-yo'qligini tekshiring (ushbu config'da bor).
- **Fayl yuklanmayapti (413)** → `client_max_body_size 100M;` borligini tekshiring (bor).
- **Katta-kichik harf / login** → login oddiy matn, DB `email` maydonida `lowercase`+`trim` bilan saqlanadi.
