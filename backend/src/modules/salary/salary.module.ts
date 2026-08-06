import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/databases/entities/user.entity';
import { Group } from 'src/databases/entities/group.entity';
import { CancelledLesson } from 'src/databases/entities/cancelled-lesson.entity';
import { SalarySettings } from 'src/databases/entities/salary-settings.entity';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, Group, CancelledLesson, SalarySettings]),
  ],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
