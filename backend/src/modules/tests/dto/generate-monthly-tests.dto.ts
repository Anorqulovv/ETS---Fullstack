import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class GenerateMonthlyTestsDto {
  @IsInt()
  groupId: number;

  @IsInt()
  directionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @IsString()
  titlePrefix?: string;
}
