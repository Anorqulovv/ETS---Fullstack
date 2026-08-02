import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CancelLessonDto {
  @ApiProperty({ example: '2026-03-21', description: "Bekor qilinadigan dars sanasi" })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: "Navro'z bayrami" })
  @IsOptional()
  @IsString()
  reason?: string;
}
