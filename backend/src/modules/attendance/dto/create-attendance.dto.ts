import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @ApiPropertyOptional({ example: 10, description: 'Student ID' })
  @IsNumber()
  studentId: number;

  @ApiPropertyOptional({ example: true, description: 'Attendance status' })
  @IsBoolean()
  @IsOptional()
  isPresent?: boolean;

  @ApiPropertyOptional({ example: 'LATE', description: 'Attendance type (e.g. PRESENT, ABSENT, LATE)' })
  @IsString()
  @IsOptional()
  type?: string; 
}