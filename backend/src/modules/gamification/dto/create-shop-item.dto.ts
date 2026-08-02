import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateShopItemDto {
  @ApiProperty({ example: 'Edu CRM stiker to\'plami' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Limited edition' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 50, description: "Narxi (ball)" })
  @IsInt()
  @Min(1)
  cost: number;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 20, description: "Ombordagi soni (bo'sh — cheklanmagan)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
