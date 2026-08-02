import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsNotEmpty, IsOptional, IsDateString, IsArray, IsInt } from 'class-validator';
import { GroupStatus } from 'src/common/enums/groupStatus.enum';

export class CreateGroupDto {
  @ApiPropertyOptional({ example: 'Frontend Group' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsEnum(GroupStatus)
  @IsNotEmpty()
  status: GroupStatus = GroupStatus.ACTIVE;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsNotEmpty()
  teacherId: number;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  directionId?: number;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-30' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  supportId?: number;

  @ApiPropertyOptional({ example: ['Monday', 'Wednesday', 'Friday'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  lessonDays?: string[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsString()
  @IsOptional()
  lessonTime?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsInt()
  @IsOptional()
  lessonDuration?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  branchId?: number;
}