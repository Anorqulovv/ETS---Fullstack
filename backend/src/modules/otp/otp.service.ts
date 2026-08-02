import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { TelegramService } from '../telegram/telegram.service';
import { succesRes } from 'src/infrastructure/utils/succes-res';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

// Redis mavjud bo'lsa ishlatiladi, aks holda xotirada saqlanadi.
// Production'da REDIS_HOST va REDIS_PORT .env ga qo'shing.
let redisClient: any = null;

async function getRedisClient() {
  if (redisClient) return redisClient;

  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT) || 6379;

  if (!host) return null;

  try {
    // ioredis o'rnatilgan bo'lsa ishlatamiz
    const Redis = require('ioredis');
    redisClient = new Redis({ host, port, lazyConnect: true });
    await redisClient.connect().catch(() => {
      redisClient = null;
    });
    return redisClient;
  } catch {
    return null;
  }
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 daqiqa
const OTP_PREFIX = 'otp:';

@Injectable()
export class OtpService {
  // Fallback: Redis bo'lmasa xotirada (development uchun)
  private otpStore = new Map<string, OtpEntry>();

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly telegramService: TelegramService,
  ) {}

  private async setOtp(key: string, entry: OtpEntry): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(
        OTP_PREFIX + key,
        JSON.stringify(entry),
        'PX',
        OTP_TTL_MS,
      );
    } else {
      this.otpStore.set(key, entry);
    }
  }

  private async getOtp(key: string): Promise<OtpEntry | null> {
    const redis = await getRedisClient();
    if (redis) {
      const raw = await redis.get(OTP_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    }
    return this.otpStore.get(key) ?? null;
  }

  private async deleteOtp(key: string): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      await redis.del(OTP_PREFIX + key);
    } else {
      this.otpStore.delete(key);
    }
  }

  private async updateOtp(key: string, entry: OtpEntry): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      // TTL ni saqlagan holda yangilaymiz
      const ttl = await redis.pttl(OTP_PREFIX + key);
      if (ttl > 0) {
        await redis.set(OTP_PREFIX + key, JSON.stringify(entry), 'PX', ttl);
      }
    } else {
      this.otpStore.set(key, entry);
    }
  }

  // OTP yuborish (phone bo'yicha)
  async sendOtp(phone: string) {
    const normalized = this._normalizePhone(phone);

    const user = await this.userRepo.findOne({ where: { phone: normalized } });
    if (!user) throw new NotFoundException('Bu raqam tizimda topilmadi');

    if (!user.telegramId) {
      throw new BadRequestException(
        "Bu raqam Telegram botga ulanmagan. Avval botga /start yuboring va raqamingizni bog'lang.",
      );
    }

    const code = this._generateCode();
    await this.setOtp(normalized, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    const message =
      `🔐 <b>Tasdiqlash kodi</b>\n\n` +
      `Sizning bir martalik kodingiz:\n\n` +
      `<code>${code}</code>\n\n` +
      `⏱ Kod 5 daqiqa davomida amal qiladi.\n` +
      `⚠️ Kodni hech kimga bermang!`;

    await this.telegramService.sendNotification(user.telegramId, message);

    return succesRes({
      message: 'OTP Telegram orqali yuborildi',
      phone: normalized,
    });
  }

  // OTP tekshirish
  async verifyOtp(phone: string, code: string) {
    const normalized = this._normalizePhone(phone);
    const entry = await this.getOtp(normalized);

    if (!entry) {
      throw new BadRequestException("OTP topilmadi yoki muddati o'tgan");
    }

    if (Date.now() > entry.expiresAt) {
      await this.deleteOtp(normalized);
      throw new BadRequestException(
        "OTP muddati o'tib ketdi. Qaytadan so'rang",
      );
    }

    entry.attempts++;

    if (entry.attempts > 3) {
      await this.deleteOtp(normalized);
      throw new BadRequestException(
        "Ko'p urinish. OTP o'chirildi. Qaytadan so'rang",
      );
    }

    if (entry.code !== code) {
      await this.updateOtp(normalized, entry);
      throw new BadRequestException(
        `Noto'g'ri kod. ${3 - entry.attempts} ta urinish qoldi`,
      );
    }

    await this.deleteOtp(normalized);
    return succesRes({ verified: true, message: 'OTP tasdiqlandi' });
  }

  private _generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private _normalizePhone(phone: string): string {
    let p = phone.replace(/[^\+\d]/g, '');
    if (!p.startsWith('+')) p = '+' + p;
    if (!p.startsWith('+998') && p.length === 9) p = '+998' + p;
    return p;
  }
}
