import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStudentDto {
  @ApiPropertyOptional({ example: 'CARD123', description: 'Card ID' })
  @IsString()
  @IsOptional()
  cardId?: string;

  @ApiPropertyOptional({ example: 1, description: 'User ID' })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({ example: 2, description: 'Parent ID' })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Group ID' })
  @IsNumber()
  @IsOptional()
  groupId?: number;
}