import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Chilonzor filiali', description: 'Filial nomi' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Chilonzor tumani, 7-mavze', description: 'Manzil' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+998711234567', description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone?: string;
}
