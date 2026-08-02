import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsInt, Min } from 'class-validator';

export class CreateDirectionDto {
  @ApiPropertyOptional({ example: 'Backend', description: 'Direction name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Node.js course', description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 10000000, description: "Kurs narxi (so'm), chegirmasiz" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 5, description: 'Kurs davomiyligi (oy)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;
}