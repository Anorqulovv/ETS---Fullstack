import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SalaryMode } from 'src/common/enums/salaryMode.enum';

export class SetUserSalaryDto {
  @ApiPropertyOptional({ enum: SalaryMode, example: SalaryMode.PER_LESSON })
  @IsOptional()
  @IsEnum(SalaryMode)
  salaryMode?: SalaryMode;

  @ApiPropertyOptional({ example: 60000, description: "Shaxsiy 1-dars narxi (bo'sh — standart qiymat ishlatiladi)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  perLessonRate?: number;

  @ApiPropertyOptional({ example: 4000000, description: "Belgilangan oylik (FIXED rejimi uchun)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;
}
