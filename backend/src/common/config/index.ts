import {config } from 'dotenv';

config();

export const envConfig = {
    PORT: Number(process.env.PORT),
    DB_URL: String(process.env.DB_URL),

    JWT_SECRET: String(process.env.JWT_SECRET),
    BOT_TOKEN: String(process.env.BOT_TOKEN),

    REDIS_HOST: String(process.env.REDIS_HOST),
    REDIS_PORT: Number(process.env.REDIS_PORT),

    TOKEN: {
        ACCESS_TOKEN_KEY: String(process.env.ACCESS_TOKEN_KEY),
        ACCESS_TOKEN_TIME: Number(process.env.ACCESS_TOKEN_TIME),

        REFRESH_TOKEN_KEY: String(process.env.REFRESH_TOKEN_KEY),
        REFRESH_TOKEN_TIME: Number(process.env.REFRESH_TOKEN_TIME)
    },

    SUPERADMIN: {
        USERNAME: String(process.env.SUPERADMIN_USERNAME),
        PASSWORD: String(process.env.SUPERADMIN_PASSWORD),
        SUPERADMIN_EMAIL: String(process.env.SUPERADMIN_EMAIL),
        PHONE: String(process.env.SUPERADMIN_PHONE),
    },

    AI: {
        GEMINI_API_KEY: String(process.env.GEMINI_API_KEY || ''),
        GEMINI_MODEL: String(process.env.GEMINI_MODEL || 'gemini-1.5-flash'),
        AI_TEST_GENERATION_ENABLED: String(process.env.AI_TEST_GENERATION_ENABLED || 'false') === 'true',
    },

    // Fayl saqlash (homework/avatar) — S3 yoki S3-mos xizmat (Selectel, Yandex
    // Object Storage va h.k.). Xuddi scripts/backup-db.sh'dagi S3_BUCKET /
    // S3_ENDPOINT_URL bilan bir xil nom — ikkalasi bir xil bucket'ga yozishi shart
    // emas, lekin bir xil xizmat/hisobga ulanadi. Bo'sh qoldirilsa (dev muhitida)
    // StorageService fayllarni bazada base64 saqlashga qaytadi — hech narsa
    // sozlanmaguncha loyiha ishlashda davom etadi.
    STORAGE: {
        S3_BUCKET: String(process.env.S3_BUCKET || ''),
        S3_ENDPOINT_URL: String(process.env.S3_ENDPOINT_URL || ''),
        S3_REGION: String(process.env.S3_REGION || 'us-east-1'),
        S3_ACCESS_KEY_ID: String(process.env.S3_ACCESS_KEY_ID || ''),
        S3_SECRET_ACCESS_KEY: String(process.env.S3_SECRET_ACCESS_KEY || ''),
        // Ochiq (public-read) bucket uchun — fayl URL shu prefiks + key bo'ladi.
        // Bo'sh qoldirilsa, standart virtual-hosted-style S3 URL quriladi.
        S3_PUBLIC_URL_BASE: String(process.env.S3_PUBLIC_URL_BASE || ''),
    },

}