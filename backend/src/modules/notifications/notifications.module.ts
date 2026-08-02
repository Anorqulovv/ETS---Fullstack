import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/databases/entities/notification.entity';
import { User } from 'src/databases/entities/user.entity';
import { Student } from 'src/databases/entities/student.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Notification, User, Student]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
