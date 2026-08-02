import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from 'src/databases/entities/question.entity';
import { Choice } from 'src/databases/entities/choice.entity';
import { Test } from 'src/databases/entities/test.entity';
import { TestType } from 'src/common/enums/test.enum';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Choice) private choiceRepo: Repository<Choice>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<ISucces> {
    const test = await this.testRepo.findOne({ where: { id: dto.testId } });
    if (!test) throw new NotFoundException(`Test ID ${dto.testId} topilmadi`);

    const correctCount = dto.choices.filter((c) => c.isCorrect).length;
    if (correctCount === 0) {
      throw new BadRequestException('Kamida bitta to\'g\'ri variant bo\'lishi kerak');
    }

    const question = this.questionRepo.create({
      text: dto.text,
      testId: dto.testId,
    });
    const savedQuestion = await this.questionRepo.save(question);

    const choices = dto.choices.map((c) =>
      this.choiceRepo.create({ ...c, questionId: savedQuestion.id }),
    );
    await this.choiceRepo.save(choices);

    const result = await this.questionRepo.findOne({
      where: { id: savedQuestion.id },
      relations: ['choices'],
    });

    return succesRes(result, 201);
  }

  async findAll(testId?: number, type?: TestType): Promise<ISucces> {
    const query = this.questionRepo
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.choices', 'choices')
      .leftJoinAndSelect('question.test', 'test')
      .orderBy('question.createdAt', 'DESC');

    if (testId) {
      query.andWhere('question.testId = :testId', { testId });
    }

    if (type) {
      query.andWhere('test.type = :type', { type });
    }

    const data = await query.getMany();
    return succesRes(data);
  }

  async findByType(type: TestType): Promise<ISucces> {
    const data = await this.questionRepo
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.choices', 'choices')
      .leftJoinAndSelect('question.test', 'test')
      .where('test.type = :type', { type })
      .orderBy('question.createdAt', 'DESC')
      .getMany();

    return succesRes(data);
  }

  async findOne(id: number): Promise<ISucces> {
    const data = await this.questionRepo.findOne({
      where: { id },
      relations: ['choices', 'test'],
    });
    if (!data) throw new NotFoundException(`Savol ID ${id} topilmadi`);
    return succesRes(data);
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<ISucces> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['choices'],
    });
    if (!question) throw new NotFoundException(`Savol ID ${id} topilmadi`);

    if (dto.testId) {
      const test = await this.testRepo.findOne({ where: { id: dto.testId } });
      if (!test) throw new NotFoundException(`Test ID ${dto.testId} topilmadi`);
    }

    const questionUpdateData: any = {};

    if (dto.text !== undefined) {
      questionUpdateData.text = dto.text;
    }

    if (dto.testId !== undefined) {
      questionUpdateData.testId = dto.testId;
    }

    if (Object.keys(questionUpdateData).length > 0) {
      await this.questionRepo.update(id, questionUpdateData);
    }

    if (dto.choices && dto.choices.length > 0) {
      const correctCount = dto.choices.filter((c) => c.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException('Kamida bitta to\'g\'ri variant bo\'lishi kerak');
      }
      await this.choiceRepo.delete({ questionId: id });
      const choices = dto.choices.map((c) =>
        this.choiceRepo.create({ ...c, questionId: id }),
      );
      await this.choiceRepo.save(choices);
    }

    const updated = await this.questionRepo.findOne({
      where: { id },
      relations: ['choices', 'test'],
    });
    return succesRes(updated!);
  }

  async remove(id: number): Promise<ISucces> {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException(`Savol ID ${id} topilmadi`);
    await this.questionRepo.delete(id);
    return succesRes({ message: 'Savol o\'chirildi' });
  }
}
