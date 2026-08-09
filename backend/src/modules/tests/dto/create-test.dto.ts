import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TestType } from 'src/common/enums/test.enum';
import { TestStatus } from 'src/common/enums/testStatus.enum';
import { CreateCodingProblemDto } from './create-coding-problem.dto';

class CreateChoiceDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices: CreateChoiceDto[];
}

export class CreateTestDto {
  @ApiPropertyOptional({ example: 'Math test', description: 'Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'DAILY', description: 'Test type' })
  @IsEnum(TestType)
  @IsNotEmpty()
  type: TestType;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Test status' })
  @IsEnum(TestStatus)
  @IsOptional()
  status?: TestStatus;

  @ApiPropertyOptional({ example: 60, description: 'Minimum score' })
  @IsNumber()
  @IsOptional()
  minScore?: number;

  @ApiPropertyOptional({ example: '2026-05-16T14:00:00.000Z', description: 'Test boshlanish vaqti' })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-05-16T16:00:00.000Z', description: 'Test tugash vaqti' })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ example: 30, description: "O'quvchi testni boshlagandan keyingi vaqt limiti (daqiqada)" })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 1, description: "Yo'nalish ID (optional)" })
  @IsNumber()
  @IsOptional()
  directionId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Guruh ID (optional)' })
  @IsNumber()
  @IsOptional()
  groupId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Dars raqami 1-12' })
  @IsNumber()
  @IsOptional()
  lessonNumber?: number;

  @ApiPropertyOptional({ example: 1, description: 'Hafta raqami 1-4' })
  @IsNumber()
  @IsOptional()
  weekNumber?: number;

  @ApiPropertyOptional({ example: 1, description: 'Oy/modul raqami' })
  @IsNumber()
  @IsOptional()
  monthNumber?: number;

  @ApiPropertyOptional({ description: 'Test savollari' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];

  @ApiPropertyOptional({ description: "Ustoz belgilagan masalalar soni (ixtiyoriy)", example: 5 })
  @IsNumber()
  @IsOptional()
  problemCount?: number;

  @ApiPropertyOptional({
    description: 'Masalalar darajalar taqsimoti, masalan {"SIMPLE":2,"MEDIUM":2,"DEEP":1}',
  })
  @IsOptional()
  problemDifficultyMix?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Testga biriktirilgan masalalar (AI generatsiyasidan yoki qo\'lda)' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCodingProblemDto)
  problems?: CreateCodingProblemDto[];
}
