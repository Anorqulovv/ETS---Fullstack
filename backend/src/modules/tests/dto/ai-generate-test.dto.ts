import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TestType } from 'src/common/enums/test.enum';

export class AiGenerateTestDto {
  @IsInt()
  directionId: number;

  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsEnum(TestType)
  type: TestType;

  @IsString()
  topic: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  lessonNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(50)
  count?: number;

  @IsOptional()
  @IsString()
  difficulty?: 'easy' | 'medium' | 'hard';

  // Masala (coding problem) qo'shish butunlay ixtiyoriy.
  // Berilmasa yoki 0 bo'lsa, AI umuman masala generatsiya qilmaydi.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  problemCount?: number;

  // Masalalar darajalar taqsimoti, masalan { "SIMPLE": 2, "MEDIUM": 2, "DEEP": 1 }
  // Berilmasa, AI problemCount asosida o'zi taqsimlaydi (sodda->o'rta->chuqur ketma-ketligida).
  @IsOptional()
  problemDifficultyMix?: Record<string, number>;
}
