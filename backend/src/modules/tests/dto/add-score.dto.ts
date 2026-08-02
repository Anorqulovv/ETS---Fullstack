import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class AddScoreDto {
  @Type(() => Number)
  @IsInt()
  testId: number;

  @Type(() => Number)
  @IsInt()
  studentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;
}
