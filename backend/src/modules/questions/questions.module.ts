import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/databases/entities/question.entity';
import { Choice } from 'src/databases/entities/choice.entity';
import { Test } from 'src/databases/entities/test.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([Question, Choice, Test])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
