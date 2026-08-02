import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Every environment variable the app actually reads, with type/format/required-ness
 * validated on startup. This is a STARTUP GATE only — it does not change how any
 * service reads config (that's still `envConfig` in ./index.ts, untouched). If this
 * validation fails, Nest never finishes bootstrapping: no route is ever registered,
 * no DB connection is attempted, nothing listens on a port. A misconfigured deploy
 * fails loudly at `npm run start`, not silently at 2am when a feature that depends
 * on the missing/malformed value first gets used.
 */
enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // ── Server ────────────────────────────────────────────────────────────
  @IsOptional()
  @IsIn(Object.values(NodeEnv))
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  // ── Database ──────────────────────────────────────────────────────────
  // IsUrl (not a hand-rolled regex) actually parses the URL structure — protocol, host,
  // port, userinfo, path — rather than just eyeballing the prefix. `require_tld: false`
  // is required here because Postgres hosts are very often NOT a real public domain:
  // "localhost" in dev, or a bare Docker Compose service name like "db" in production
  // (see docker-compose.yml — the `api` service talks to Postgres as host "db").
  @IsNotEmpty({ message: 'DB_URL majburiy — Postgres ulanish satri yo\'q' })
  @IsUrl(
    {
      protocols: ['postgres', 'postgresql'],
      require_protocol: true,
      require_tld: false,
      allow_underscores: true,
    },
    {
      message:
        'DB_URL "postgresql://user:pass@host:port/dbname" ko\'rinishidagi to\'g\'ri Postgres ulanish satri bo\'lishi kerak',
    },
  )
  DB_URL: string;

  // ── JWT / tokens ──────────────────────────────────────────────────────
  // 32+ belgi — HMAC-SHA256 uchun standart minimal xavfsizlik chegarasi (256 bit entropiya).
  @IsNotEmpty()
  @MinLength(32, { message: 'JWT_SECRET kamida 32 belgidan iborat bo\'lishi kerak' })
  JWT_SECRET: string;

  @IsNotEmpty()
  @MinLength(32, { message: 'ACCESS_TOKEN_KEY kamida 32 belgidan iborat bo\'lishi kerak' })
  ACCESS_TOKEN_KEY: string;

  @IsInt()
  @Min(60, { message: 'ACCESS_TOKEN_TIME kamida 60 (soniya) bo\'lishi kerak' })
  ACCESS_TOKEN_TIME: number;

  @IsNotEmpty()
  @MinLength(32, { message: 'REFRESH_TOKEN_KEY kamida 32 belgidan iborat bo\'lishi kerak' })
  REFRESH_TOKEN_KEY: string;

  @IsInt()
  @Min(60, { message: 'REFRESH_TOKEN_TIME kamida 60 (soniya) bo\'lishi kerak' })
  REFRESH_TOKEN_TIME: number;

  // ── Telegram bot (OTP login + attendance/test/payment notifications all depend on this) ──
  @IsNotEmpty({ message: 'BOT_TOKEN majburiy — Telegram bot orqali OTP va xabarnomalar shunga bog\'liq' })
  @Matches(/^\d+:[A-Za-z0-9_-]{30,}$/, {
    message: 'BOT_TOKEN Telegram bot token formatiga mos emas (masalan: 123456789:AAbecb...)',
  })
  BOT_TOKEN: string;

  // ── Redis (.env.sample'da "production uchun majburiy" deb ta'kidlangan — OTP/session shunga bog'liq) ──
  @IsNotEmpty({ message: 'REDIS_HOST majburiy — OTP va sessiya saqlash Redis\'ga bog\'liq' })
  @IsString()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  // ── Dastlabki superadmin (birinchi ishga tushirishda avtomatik yaratiladi) ──
  @IsNotEmpty()
  @MinLength(3, { message: 'SUPERADMIN_USERNAME kamida 3 belgi bo\'lishi kerak' })
  SUPERADMIN_USERNAME: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'SUPERADMIN_PASSWORD kamida 8 belgi bo\'lishi kerak' })
  SUPERADMIN_PASSWORD: string;

  @IsNotEmpty()
  @Matches(/^\+?\d{9,15}$/, {
    message: 'SUPERADMIN_PHONE telefon raqami formatida bo\'lishi kerak (masalan: +998901234567)',
  })
  SUPERADMIN_PHONE: string;

  // Kodda hech qayerda ishlatilmaydi (users.service.ts faqat USERNAME/PASSWORD/PHONE'ni
  // o'qiydi) — shunga qaramay, agar kelajakda kerak bo'lsa deb formatini tekshiramiz.
  @IsOptional()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'SUPERADMIN_EMAIL to\'g\'ri email formatida bo\'lishi kerak' })
  SUPERADMIN_EMAIL?: string;

  // ── CORS — production'da bo'sh qolsa BARCHA so'rovlar bloklanadi (app.service.ts) ──
  // app.service.ts reads this as a raw comma-separated string and splits it itself —
  // that behavior is untouched. This Transform only affects what gets VALIDATED here;
  // it does not mutate process.env or change what any service actually reads.
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    return value
      .split(',')
      .map((origin: string) => origin.trim())
      .filter(Boolean);
  })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    {
      each: true,
      message:
        'ALLOWED_ORIGINS ichidagi har bir manzil to\'liq URL bo\'lishi kerak (masalan: https://edu-najottalim.uz), vergul bilan ajratilgan',
    },
  )
  ALLOWED_ORIGINS?: string[];

  // ── AI test generatsiya (ixtiyoriy funksiya) ─────────────────────────
  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_MODEL?: string;

  @IsOptional()
  @IsBooleanString({ message: 'AI_TEST_GENERATION_ENABLED faqat "true" yoki "false" bo\'lishi mumkin' })
  AI_TEST_GENERATION_ENABLED?: string;
}

/**
 * Passed to ConfigModule.forRoot({ validate }) in app.module.ts. Runs once, synchronously,
 * while Nest is building the DI container — before any other module's onModuleInit (including
 * the superadmin auto-seed in users.service.ts) and long before app.listen(). Throwing here
 * stops the app from starting at all.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true, // "7001" (string, as all env vars are) -> 7001 (number) before validating
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false, // process.env has hundreds of unrelated OS/system vars — only ours are checked, the rest pass through untouched
  });

  const messages = errors.map(
    (e) => `${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
  );

  // Cross-field checks class-validator's per-property decorators can't express on their own.
  if (
    validated.ACCESS_TOKEN_TIME &&
    validated.REFRESH_TOKEN_TIME &&
    validated.REFRESH_TOKEN_TIME <= validated.ACCESS_TOKEN_TIME
  ) {
    messages.push(
      "REFRESH_TOKEN_TIME: ACCESS_TOKEN_TIME dan katta bo'lishi kerak (refresh token access tokendan uzoqroq yashashi shart)",
    );
  }

  const isProduction = (validated.NODE_ENV ?? config.NODE_ENV) === NodeEnv.Production;
  if (isProduction && !validated.ALLOWED_ORIGINS?.length) {
    messages.push(
      "ALLOWED_ORIGINS: NODE_ENV=production bo'lganda majburiy — aks holda CORS BARCHA so'rovlarni bloklaydi (app.service.ts)",
    );
  }

  if (messages.length > 0) {
    const details = messages.map((m) => `  • ${m}`).join('\n');
    throw new Error(
      `\n\n❌ .env sozlamalarida xatolik(lar) topildi — server ishga tushmadi:\n\n${details}\n\n` +
        `.env.sample fayl bilan solishtirib tekshiring.\n`,
    );
  }

  return validated;
}
