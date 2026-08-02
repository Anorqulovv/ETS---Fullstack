import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserActivity } from 'src/databases/entities/user-activity.entity';
import { User } from 'src/databases/entities/user.entity';
import { succesRes } from 'src/infrastructure/utils/succes-res';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(UserActivity)
    private readonly activityRepo: Repository<UserActivity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private getAction(method: string, path: string) {
    if (path.includes('/auth/login')) return 'Platformaga kirdi';
    if (path.includes('/auth/otp/verify')) return 'OTP orqali platformaga kirdi';
    if (method === 'POST' && path.includes('/tests')) return 'Test yaratdi';
    if ((method === 'PATCH' || method === 'PUT') && path.includes('/tests')) return 'Testni o‘zgartirdi';
    if (method === 'DELETE' && path.includes('/tests')) return 'Testni o‘chirdi';
    if (method === 'POST' && path.includes('/students')) return 'O‘quvchi yaratdi';
    if ((method === 'PATCH' || method === 'PUT') && path.includes('/students')) return 'O‘quvchini o‘zgartirdi';
    if (method === 'POST' && path.includes('/attendance')) return 'Davomat qildi';
    if (method === 'POST' && path.includes('/notifications')) return 'Bildirishnoma yubordi';
    if (method === 'POST') return 'Ma’lumot yaratdi';
    if (method === 'PATCH' || method === 'PUT') return 'Ma’lumot o‘zgartirdi';
    if (method === 'DELETE') return 'Ma’lumot o‘chirdi';
    if (method === 'GET') return 'Sahifa/API ko‘rdi';
    return 'Faollik';
  }

  async touchUser(userId: number) {
    if (!userId) return;
    await this.userRepo.update(userId, { lastSeenAt: new Date() });
  }

  async markLogin(userId: number) {
    if (!userId) return;
    const now = new Date();
    await this.userRepo.update(userId, {
      lastLoginAt: now,
      lastSeenAt: now,
    });
  }

  async logActivity(data: {
    userId?: number;
    method: string;
    path: string;
    statusCode?: number;
    ip?: string;
    userAgent?: string;
  }) {
    if (!data.userId) return;

    const path = data.path || '';

    // Activity page o'zini log qilmasin, aks holda log juda tez ko'payadi
    if (path.includes('/activity')) return;

    const activity = this.activityRepo.create({
      userId: data.userId,
      method: data.method,
      path,
      action: this.getAction(data.method, path),
      statusCode: data.statusCode,
      ip: data.ip,
      userAgent: data.userAgent,
    });

    await this.activityRepo.save(activity);
  }

  async overview() {
    const onlineFrom = new Date(Date.now() - 5 * 60 * 1000);

    const users = await this.userRepo.find({
      order: { lastSeenAt: 'DESC' },
      relations: ['direction', 'branch'],
    });

    const result = users.map(({ password: _, ...user }) => ({
      ...user,
      isOnline: !!user.lastSeenAt && new Date(user.lastSeenAt) >= onlineFrom,
    }));

    return succesRes(result);
  }

  async logs(query: any) {
    const take = Math.min(Number(query?.limit ?? 100), 300);

    const where: any = {};
    if (query?.userId) where.userId = Number(query.userId);

    const logs = await this.activityRepo.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take,
    });

    const result = logs.map((item) => ({
      id: item.id,
      userId: item.userId,
      user: item.user
        ? {
            id: item.user.id,
            fullName: item.user.fullName,
            username: item.user.username,
            role: item.user.role,
            phone: item.user.phone,
          }
        : null,
      action: item.action,
      method: item.method,
      path: item.path,
      statusCode: item.statusCode,
      ip: item.ip,
      userAgent: item.userAgent,
      createdAt: item.createdAt,
    }));

    return succesRes(result);
  }
}
