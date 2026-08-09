#!/usr/bin/env bash
#
# Postgres bazasini avtomatik zaxiralash (backup) skripti.
#
# Nima qiladi:
#   1. `docker compose exec` orqali `db` konteyneri ichida pg_dump ishga tushiradi
#      (host'da alohida postgres-client o'rnatish shart emas)
#   2. Natijani gzip bilan siqadi va BACKUP_DIR'ga saqlaydi
#   3. (ixtiyoriy) S3'ga yoki boshqa serverga (rsync/scp) yuklaydi — "serverdan tashqarida"
#      saqlash shart, chunki server o'zi buzilsa/o'chib qolsa, faqat shu yerda turgan
#      zaxira ham yo'qoladi
#   4. Eski mahalliy zaxiralarni RETENTION_DAYS'dan keyin o'chiradi
#   5. Xato bo'lsa (va BOT_TOKEN/CHAT_ID berilgan bo'lsa) Telegram orqali xabar beradi
#
# Ishlatish:
#   chmod +x scripts/backup-db.sh
#   ./scripts/backup-db.sh
#
# Cron orqali har kuni soat 03:00da ishga tushirish uchun (`crontab -e`):
#   0 3 * * * cd /path/to/Edu-backend && ./scripts/backup-db.sh >> /var/log/edu-backup.log 2>&1
#
# Batafsil: scripts/README.md

set -euo pipefail

# ── Sozlamalar (kerak bo'lsa .env yoki muhit o'zgaruvchisi orqali override qiling) ──
COMPOSE_SERVICE="${COMPOSE_SERVICE:-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-edu_db}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# S3'ga yuklash (ixtiyoriy) — quyidagilarni to'ldirsangiz avtomatik ishlaydi.
# AWS S3 ham, S3-mos boshqa xizmatlar (Selectel, Yandex Object Storage va h.k.)
# ham ishlaydi — shunchaki S3_ENDPOINT_URL'ni shu xizmatnikiga o'zgartiring.
S3_BUCKET="${S3_BUCKET:-}"
S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-}"   # bo'sh qoldirsangiz — haqiqiy AWS S3

# Boshqa serverga rsync/scp orqali nusxalash (ixtiyoriy, S3'ga alternativ)
REMOTE_HOST="${REMOTE_HOST:-}"           # masalan: user@backup-server.com
REMOTE_DIR="${REMOTE_DIR:-}"             # masalan: /home/user/edu-backups

# Xato haqida Telegram orqali xabar berish (ixtiyoriy — sizda BOT_TOKEN allaqachon bor)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-${BOT_TOKEN:-}}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILENAME="edu_db_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

notify_failure() {
  local message="$1"
  echo "XATO: ${message}" >&2
  if [[ -n "${TELEGRAM_BOT_TOKEN}" && -n "${TELEGRAM_CHAT_ID}" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=🔴 Edu CRM zaxira (backup) muvaffaqiyatsiz: ${message}" \
      > /dev/null || true
  fi
}

trap 'notify_failure "backup-db.sh script kutilmagan joyda to'"'"'xtadi (qator: $LINENO)"' ERR

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Zaxira boshlandi: ${FILENAME}"

# 1) Dump olish (Docker konteyner ichida pg_dump ishga tushiriladi)
docker compose exec -T "${COMPOSE_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-privileges \
  | gzip > "${FILEPATH}"

# Dump haqiqatan ham bo'sh emasligini tekshirish (masalan konteyner ishlamasa,
# yuqoridagi buyruq xato bilan emas, bo'sh natija bilan tugashi ham mumkin)
if [[ ! -s "${FILEPATH}" ]]; then
  rm -f "${FILEPATH}"
  notify_failure "Hosil bo'lgan dump fayli bo'sh — Docker konteyner ishlayotganini tekshiring"
  exit 1
fi

SIZE_HUMAN="$(du -h "${FILEPATH}" | cut -f1)"
echo "[$(date)] Mahalliy zaxira tayyor: ${FILEPATH} (${SIZE_HUMAN})"

# 2a) S3'ga yuklash (agar sozlangan bo'lsa)
if [[ -n "${S3_BUCKET}" ]]; then
  ENDPOINT_ARG=()
  [[ -n "${S3_ENDPOINT_URL}" ]] && ENDPOINT_ARG=(--endpoint-url "${S3_ENDPOINT_URL}")
  if aws s3 cp "${ENDPOINT_ARG[@]}" "${FILEPATH}" "s3://${S3_BUCKET}/${FILENAME}"; then
    echo "[$(date)] S3'ga yuklandi: s3://${S3_BUCKET}/${FILENAME}"
  else
    notify_failure "S3'ga yuklashda xatolik (mahalliy nusxa saqlanib qoldi: ${FILEPATH})"
  fi
fi

# 2b) Boshqa serverga rsync orqali nusxalash (agar sozlangan bo'lsa)
if [[ -n "${REMOTE_HOST}" && -n "${REMOTE_DIR}" ]]; then
  if rsync -az "${FILEPATH}" "${REMOTE_HOST}:${REMOTE_DIR}/"; then
    echo "[$(date)] Masofaviy serverga nusxalandi: ${REMOTE_HOST}:${REMOTE_DIR}/${FILENAME}"
  else
    notify_failure "Masofaviy serverga (rsync) nusxalashda xatolik (mahalliy nusxa saqlanib qoldi: ${FILEPATH})"
  fi
fi

if [[ -z "${S3_BUCKET}" && -z "${REMOTE_HOST}" ]]; then
  echo "[$(date)] OGOHLANTIRISH: S3_BUCKET yoki REMOTE_HOST sozlanmagan — zaxira FAQAT shu serverda saqlanmoqda." >&2
  echo "                Server o'zi nosoz bo'lib qolsa, bu zaxira ham yo'qoladi. scripts/README.md'ga qarang." >&2
fi

# 3) Eski mahalliy zaxiralarni tozalash
find "${BACKUP_DIR}" -name 'edu_db_*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date)] Zaxira muvaffaqiyatli yakunlandi."
