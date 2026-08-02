import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from 'src/databases/entities/group.entity';
import { Direction } from 'src/databases/entities/direction.entity';
import { User } from 'src/databases/entities/user.entity';
import { CancelledLesson } from 'src/databases/entities/cancelled-lesson.entity';
import { Student } from 'src/databases/entities/student.entity';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([Group, Direction, User, CancelledLesson, Student])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}