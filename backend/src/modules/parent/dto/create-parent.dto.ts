import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CreateParentDto {
  @ApiPropertyOptional({ example: 1, description: 'User ID' })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({ example: 10, description: 'Student ID' })
  @IsNumber()
  @IsOptional()
  studentId?: number;

  @ApiPropertyOptional({ example: '+998901234568', description: 'Ikkinchi telefon raqami (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'phone2 +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone2?: string;
}