import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from 'src/databases/entities/attendance.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Group } from 'src/databases/entities/group.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Attendance, Student, Group]),
    TelegramModule,
    GamificationModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
