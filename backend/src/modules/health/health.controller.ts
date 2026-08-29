import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Response } from 'express';
import Redis from 'ioredis';
import { envConfig } from 'src/common/config';

/**
 * Public, auth-free health endpoint for uptime monitoring / load balancers / deploy
 * scripts. Intentionally lightweight — no NestJS guards, no DB writes, just two
 * cheap read-only checks (Postgres `SELECT 1`, Redis `PING`) with a short timeout
 * so a monitoring tool never hangs waiting on this.
 *
 * GET /api/health -> 200 { status: "ok", db: "up", redis: "up" }
 *                  -> 503 { status: "degraded", db: "up"|"down", redis: "up"|"down" }
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: "Server, DB va Redis holatini tekshirish (monitoring uchun)",
  })
  async check(@Res() res: Response) {
    const [dbUp, redisUp] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
    ]);

    const healthy = dbUp && redisUp;

    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: healthy ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    // Ayni maqsad uchun qisqa umrli, qisqa timeout'li mijoz — otp/session
    // modullaridagi doimiy ulanishlarga bog'liq bo'lmasin, shuning uchun
    // health check ular ishlamay qolgan taqdirda ham mustaqil ishlaydi.
    const client = new Redis({
      host: envConfig.REDIS_HOST,
      port: envConfig.REDIS_PORT,
      lazyConnect: true,
      connectTimeout: 1500,
      maxRetriesPerRequest: 0,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    } finally {
      client.disconnect();
    }
  }
}
