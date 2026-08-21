import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeworkAssignment } from 'src/databases/entities/homework-assignment.entity';
import { HomeworkSubmission } from 'src/databases/entities/homework-submission.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Group } from 'src/databases/entities/group.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([HomeworkAssignment, HomeworkSubmission, Student, Group]),
    GamificationModule,
  ],
  controllers: [HomeworkController],
  providers: [HomeworkService],
})
export class HomeworkModule {}
