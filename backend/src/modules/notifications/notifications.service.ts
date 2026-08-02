import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from 'src/databases/entities/notification.entity';
import { User } from 'src/databases/entities/user.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Repository } from 'typeorm';
import { UserRole } from 'src/common/enums/role.enum';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { BroadcastNotificationDto, NotificationAudience } from './dto/broadcast-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  /** SUPERADMIN/ADMIN sends a message to everyone, a whole role, or one group's students. */
  async broadcast(senderId: number, dto: BroadcastNotificationDto): Promise<ISucces> {
    let recipientIds: number[] = [];

    switch (dto.audience) {
      case NotificationAudience.ALL: {
        const users = await this.userRepo.find({ select: ['id'] });
        recipientIds = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.STUDENTS: {
        const users = await this.userRepo.find({ where: { role: UserRole.STUDENT }, select: ['id'] });
        recipientIds = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.PARENTS: {
        const users = await this.userRepo.find({ where: { role: UserRole.PARENT }, select: ['id'] });
        recipientIds = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.TEACHERS: {
        const users = await this.userRepo.find({ where: { role: UserRole.TEACHER }, select: ['id'] });
        recipientIds = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.GROUP: {
        if (!dto.groupId) throw new BadRequestException("audience = GROUP bo'lsa groupId majburiy");
        const students = await this.studentRepo.find({ where: { groupId: dto.groupId } });
        recipientIds = students.map((s) => s.userId).filter((id): id is number => !!id);
        break;
      }
    }

    // O'zi o'ziga xabar yubormasin (masalan ADMIN "ALL" tanlasa).
    recipientIds = recipientIds.filter((id) => id !== senderId);

    if (!recipientIds.length) {
      return succesRes({ message: 'Qabul qiluvchi topilmadi', count: 0 });
    }

    await this.createForUsers({
      recipientIds,
      senderId,
      title: dto.title,
      message: dto.message,
      type: 'ANNOUNCEMENT',
    });

    return succesRes({ message: 'Yuborildi', count: recipientIds.length });
  }

  async createForUser(payload: {
    recipientId: number;
    senderId?: number;
    title?: string;
    message: string;
    type?: string;
  }) {
    const notification = this.notificationRepo.create({
      recipientId: payload.recipientId,
      senderId: payload.senderId,
      title: payload.title ?? 'Xabar',
      message: payload.message,
      type: payload.type ?? 'MESSAGE',
    });

    return this.notificationRepo.save(notification);
  }

  async createForUsers(payload: {
    recipientIds: number[];
    senderId?: number;
    title?: string;
    message: string;
    type?: string;
  }) {
    if (!payload.recipientIds.length) return [];

    const notifications = payload.recipientIds.map((recipientId) =>
      this.notificationRepo.create({
        recipientId,
        senderId: payload.senderId,
        title: payload.title ?? 'Xabar',
        message: payload.message,
        type: payload.type ?? 'MESSAGE',
      }),
    );

    return this.notificationRepo.save(notifications);
  }

  async findMy(userId: number): Promise<ISucces> {
    const data = await this.notificationRepo.find({
      where: { recipientId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return succesRes(data);
  }

  async unreadCount(userId: number): Promise<ISucces> {
    const count = await this.notificationRepo.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return succesRes({ count });
  }

  async markAsRead(id: number, userId: number): Promise<ISucces> {
    const notification = await this.notificationRepo.findOne({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification topilmadi');
    }

    await this.notificationRepo.update(id, {
      isRead: true,
      readAt: new Date(),
    });

    return succesRes({ message: "O'qildi" });
  }

  async markAllAsRead(userId: number): Promise<ISucces> {
    await this.notificationRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return succesRes({ message: "Barchasi o'qildi" });
  }
}
