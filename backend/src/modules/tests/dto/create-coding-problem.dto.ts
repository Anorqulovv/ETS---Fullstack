import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ProblemDifficulty } from 'src/common/enums/problem-difficulty.enum';

export class CreateCodingProblemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ProblemDifficulty)
  @IsOptional()
  difficulty?: ProblemDifficulty;

  @IsString()
  @IsOptional()
  starterCode?: string;

  @IsString()
  @IsOptional()
  sampleInput?: string;

  @IsString()
  @IsOptional()
  sampleOutput?: string;

  @IsString()
  @IsOptional()
  constraints?: string;

  // Faqat backend/AI tomonidan to'ldiriladi, teacher orqali kelmasligi kerak,
  // lekin ai-generate javobini qayta create qilishda foydali bo'lishi mumkin.
  @IsString()
  @IsOptional()
  referenceSolution?: string;

  @IsString()
  @IsOptional()
  generatedBy?: string;
}
