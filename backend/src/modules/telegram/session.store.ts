/**
 * SessionStore — Telegram bot session saqlovchi.
 * Redis mavjud bo'lsa Redis'da, aks holda xotirada saqlanadi.
 * Production'da REDIS_HOST va REDIS_PORT .env da bo'lishi kerak.
 */

let redisClient: any = null;

async function getRedis() {
  if (redisClient) return redisClient;
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT) || 6379;
  if (!host) return null;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis({ host, port, lazyConnect: true });
    await redisClient.connect().catch(() => { redisClient = null; });
    return redisClient;
  } catch {
    return null;
  }
}

const SESSION_PREFIX = 'tg_session:';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 kun

export class SessionStore {
  private memStore = new Map<number, number>();

  async set(telegramId: number, userId: number): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      await redis.set(SESSION_PREFIX + telegramId, String(userId), 'EX', SESSION_TTL_SECONDS);
    } else {
      this.memStore.set(telegramId, userId);
    }
  }

  async get(telegramId: number): Promise<number | null> {
    const redis = await getRedis();
    if (redis) {
      const val = await redis.get(SESSION_PREFIX + telegramId);
      return val ? Number(val) : null;
    }
    return this.memStore.get(telegramId) ?? null;
  }

  async delete(telegramId: number): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      await redis.del(SESSION_PREFIX + telegramId);
    } else {
      this.memStore.delete(telegramId);
    }
  }
}

export const sessionStore = new SessionStore();
