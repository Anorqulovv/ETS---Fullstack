import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from 'src/databases/entities/test.entity';
import { TestResult } from 'src/databases/entities/test-result.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { Question } from 'src/databases/entities/question.entity';

import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { TelegramModule } from 'src/modules/telegram/telegram.module';
import { GamificationModule } from 'src/modules/gamification/gamification.module';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Test, TestResult, Student, Parent, Question]),
    TelegramModule,
    GamificationModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
