import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GradeHomeworkDto {
  @ApiProperty({ example: 85, description: '0 dan 100 gacha ball' })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional({ example: "Yaxshi ishlagansiz, faqat 3-masalada xatolik bor" })
  @IsOptional()
  @IsString()
  feedback?: string;
}
