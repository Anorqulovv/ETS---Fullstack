import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class SubmitHomeworkDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  assignmentId: number;

  @ApiPropertyOptional({ example: 'https://github.com/.../pull/5' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ example: 'uyga-vazifa.zip' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 'data:application/zip;base64,UEsDBBQ...' })
  @IsOptional()
  @IsString()
  fileData?: string;
}
