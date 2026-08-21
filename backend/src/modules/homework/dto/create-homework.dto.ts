import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty({ example: "JS asoslari — 3-dars uyga vazifa" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "Massivlar bo'yicha 5 ta masala yeching" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12, description: 'Qaysi guruhga beriladi' })
  @IsInt()
  groupId: number;

  @ApiPropertyOptional({ example: '2026-08-25T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
