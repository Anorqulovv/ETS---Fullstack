import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from 'src/databases/entities/user.entity';
import { Group } from 'src/databases/entities/group.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { Payment } from 'src/databases/entities/payment.entity';
import { TestResult } from 'src/databases/entities/test-result.entity';
import { Attendance } from 'src/databases/entities/attendance.entity';
import { UserActivity } from 'src/databases/entities/user-activity.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      Group,
      Student,
      Parent,
      Payment,
      TestResult,
      Attendance,
      UserActivity,
    ]),
  ],
  providers: [UsersService, CryptoService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
