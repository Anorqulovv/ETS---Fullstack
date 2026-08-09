# Bazani avtomatik zaxiralash (backup)

Bu papkadagi ikkita skript:
- `backup-db.sh` — kuniga bir marta (yoki xohlagan chastotada) avtomatik zaxira oladi
- `restore-db.sh` — zaxiradan tiklaydi (test yoki haqiqiy tiklash uchun)

## 1-qadam: Skriptlarni ishga tayyorlash

```bash
cd /path/to/Edu-backend
chmod +x scripts/backup-db.sh scripts/restore-db.sh
mkdir -p backups
```

`.gitignore`ga qo'shib qo'ying (zaxiralar Git'ga tushmasin):
```
backups/
```

## 2-qadam: Qayerga saqlash — S3 yoki boshqa server

**"Serverdan tashqarida" saqlash shart** — agar server o'zi ishlamay qolsa yoki
disk buzilsa, faqat shu serverda turgan zaxira ham baravar yo'qoladi.

### A) S3 (yoki S3-mos xizmat) orqali — tavsiya etiladi

AWS S3, yoki O'zbekiston/CIS mintaqasida keng tarqalgan S3-mos xizmatlar
(Selectel, Yandex Object Storage va h.k.) ishlaydi.

```bash
# AWS CLI o'rnatish (bir marta)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Kirish ma'lumotlarini sozlash (bir marta)
aws configure
```

Keyin serverdagi `.env` fayliga (yoki `/etc/environment`ga) qo'shing:
```bash
S3_BUCKET=edu-crm-backups
# Agar AWS S3 emas, boshqa S3-mos xizmat bo'lsa (masalan Selectel):
# S3_ENDPOINT_URL=https://s3.ru-1.storage.selcloud.ru
```

### B) Yoki — ikkinchi (zaxira) serverga rsync orqali

Agar S3 shart bo'lmasa, oddiygina boshqa bir VPS'ga nusxalash ham yetarli:

```bash
# Backup serveriga SSH kalit orqali parolisiz kirish sozlanishi kerak (bir marta):
ssh-copy-id user@backup-server.com
```

`.env`ga qo'shing:
```bash
REMOTE_HOST=user@backup-server.com
REMOTE_DIR=/home/user/edu-backups
```

**Ikkalasini ham sozlash shart emas — bittasi kifoya, lekin ikkalasi bo'lsa yanada xavfsiz.**

## 3-qadam: Xato bo'lsa Telegram orqali xabar olish (ixtiyoriy, tavsiya etiladi)

Sizda allaqachon Telegram bot bor (`BOT_TOKEN`) — shundan foydalanish mumkin:

```bash
TELEGRAM_CHAT_ID=123456789   # o'zingizning yoki admin guruhning chat ID'si
```

`TELEGRAM_BOT_TOKEN` berilmasa, skript avtomatik `.env`dagi `BOT_TOKEN`ni ishlatadi.

## 4-qadam: Cron orqali har kuni avtomatik ishga tushirish

```bash
crontab -e
```

Quyidagi qatorni qo'shing (har kuni soat 03:00da, trafik eng kam vaqtda):

```cron
0 3 * * * cd /path/to/Edu-backend && ./scripts/backup-db.sh >> /var/log/edu-backup.log 2>&1
```

**Muqobil — systemd timer** (loglarni `journalctl` orqali ko'rish qulayroq bo'lsa):

`/etc/systemd/system/edu-backup.service`:
```ini
[Unit]
Description=Edu CRM Postgres backup

[Service]
Type=oneshot
WorkingDirectory=/path/to/Edu-backend
EnvironmentFile=/path/to/Edu-backend/.env
ExecStart=/path/to/Edu-backend/scripts/backup-db.sh
```

`/etc/systemd/system/edu-backup.timer`:
```ini
[Unit]
Description=Edu CRM Postgres backup — kuniga bir marta

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Yoqish:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now edu-backup.timer
sudo systemctl list-timers edu-backup.timer   # keyingi ishga tushish vaqtini tekshirish
```

## 5-qadam: Zaxirani tiklashni SINAB KO'RING

Bu eng ko'p unutiladigan, lekin eng muhim qadam. Oyiga kamida bir marta:

```bash
# Eng oxirgi zaxirani vaqtinchalik alohida bazaga tiklab ko'ring (asl bazaga tegmaydi):
./scripts/restore-db.sh backups/edu_db_2026-08-09_03-00-00.sql.gz
```

Skript oxirida ma'lumot to'g'ri tiklanganini tekshirish uchun buyruqlarni ko'rsatadi
(jadvallar ro'yxati, qatorlar soni va h.k.).

**Haqiqiy falokat vaqtida** (asosiy bazani butunlay tiklash kerak bo'lganda):
```bash
./scripts/restore-db.sh backups/edu_db_2026-08-09_03-00-00.sql.gz --production
```
Bu sizdan bazaning nomini qo'lda kiritishingizni so'raydi — tasodifan bosilib ketishning oldini olish uchun.

## Muhim eslatmalar

- Zaxira `pg_dump` orqali oddiy SQL formatda olinadi — kichik/o'rta bazalar uchun
  yetarli. Baza juda katta (o'nlab GB) bo'lib qolsa, `pg_dump --format=custom`
  formatiga o'tish tezroq bo'ladi (parallel tiklash imkoniyati bilan).
- `RETENTION_DAYS` (standart: 14 kun) — shundan eski **mahalliy** fayllar
  avtomatik o'chiriladi. S3/masofaviy nusxalar bunga ta'sir qilmaydi — ular
  uchun alohida S3 lifecycle policy yoki boshqa tozalash qoidasi qo'ying.
- `docker-compose.yml`dagi Postgres paroli (`admin123`) — bu demo/boshlang'ich
  qiymat, production serveringizda buni albatta kuchli parolga almashtiring.
