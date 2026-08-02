import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AwardPointsDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: 15, description: "Qo'shiladigan (yoki manfiy bo'lsa, ayiriladigan) ball" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: "Olimpiadada g'olib bo'lgani uchun" })
  @IsOptional()
  @IsString()
  note?: string;
}
