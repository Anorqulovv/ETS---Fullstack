import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";

import { User } from "src/databases/entities/user.entity";
import { Student } from "src/databases/entities/student.entity";
import { Parent } from "src/databases/entities/parent.entity";
import { Group } from "src/databases/entities/group.entity";
import { Attendance } from "src/databases/entities/attendance.entity";
import { TestResult } from "src/databases/entities/test-result.entity";
import { Test } from "src/databases/entities/test.entity";
import { Notification } from "src/databases/entities/notification.entity"; 

import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Student, Parent, Group, Attendance, TestResult, Test, Notification]),
    JwtModule.register({}),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}