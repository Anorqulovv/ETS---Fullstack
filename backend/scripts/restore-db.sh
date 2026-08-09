#!/usr/bin/env bash
#
# Zaxira nusxadan bazani tiklash skripti.
#
# "Sinalmagan zaxira — zaxira emas": bu skript ikki rejimda ishlaydi —
#   1. Standart (xavfsiz): TEKSHIRUV uchun VAQTINCHALIK, alohida bazaga tiklaydi
#      (mavjud edu_db'ga tegmaydi) — har oyda kamida bir marta shu bilan
#      zaxirangiz haqiqatan ham ishlashini tekshirib turing.
#   2. --production bilan: haqiqiy edu_db bazasini QAYTA TIKLAYDI (mavjud
#      ma'lumotni butunlay almashtiradi) — faqat haqiqiy falokat vaqtida ishlating.
#
# Ishlatish:
#   ./scripts/restore-db.sh backups/edu_db_2026-08-09_03-00-00.sql.gz
#   ./scripts/restore-db.sh backups/edu_db_2026-08-09_03-00-00.sql.gz --production

set -euo pipefail

BACKUP_FILE="${1:-}"
MODE="${2:-}"

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Xato: zaxira fayli ko'rsatilmagan yoki topilmadi." >&2
  echo "Ishlatish: $0 <backup-fayli.sql.gz> [--production]" >&2
  exit 1
fi

COMPOSE_SERVICE="${COMPOSE_SERVICE:-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [[ "${MODE}" == "--production" ]]; then
  POSTGRES_DB="${POSTGRES_DB:-edu_db}"
  echo "⚠️  DIQQAT: bu '${POSTGRES_DB}' bazasini TO'LIQ ALMASHTIRADI (hozirgi ma'lumot yo'qoladi)."
  read -r -p "Davom etish uchun bazaning nomini qo'lda kiriting (${POSTGRES_DB}): " CONFIRM
  if [[ "${CONFIRM}" != "${POSTGRES_DB}" ]]; then
    echo "Bekor qilindi — kiritilgan nom mos kelmadi."
    exit 1
  fi
else
  # Xavfsiz rejim: test uchun alohida vaqtinchalik baza
  POSTGRES_DB="edu_db_restore_test"
  echo "Test rejimi: '${POSTGRES_DB}' nomli VAQTINCHALIK bazaga tiklanadi (asosiy bazaga tegilmaydi)."
  docker compose exec -T "${COMPOSE_SERVICE}" \
    psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
  docker compose exec -T "${COMPOSE_SERVICE}" \
    psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"
fi

echo "[$(date)] Tiklash boshlandi: ${BACKUP_FILE} -> ${POSTGRES_DB}"

gunzip -c "${BACKUP_FILE}" | docker compose exec -T "${COMPOSE_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "[$(date)] Tiklash yakunlandi."

if [[ "${MODE}" != "--production" ]]; then
  echo
  echo "Tekshirish uchun namuna buyruq (jadvallar soni va bitta jadvaldagi qatorlar sonini ko'rish):"
  echo "  docker compose exec ${COMPOSE_SERVICE} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c \"\\dt\""
  echo "  docker compose exec ${COMPOSE_SERVICE} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c \"SELECT count(*) FROM \\\"user\\\";\""
  echo
  echo "Tekshirib bo'lgach, vaqtinchalik bazani o'chirib qo'ying:"
  echo "  docker compose exec ${COMPOSE_SERVICE} psql -U ${POSTGRES_USER} -d postgres -c \"DROP DATABASE ${POSTGRES_DB};\""
fi
