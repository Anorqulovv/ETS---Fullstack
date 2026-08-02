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
}
