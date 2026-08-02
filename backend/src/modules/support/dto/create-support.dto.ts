import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsStrongPassword, IsInt, IsPositive, Matches, MinLength, IsNumber } from "class-validator";
import { Gender } from 'src/common/enums/gender.enum';

export class CreateSupportDto {
  @ApiProperty({ example: 'Zulfiya Supportova' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'zulfiya_support' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username noto\'g\'ri format' })
  username: string;

  @ApiProperty({ example: '+998905556677' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone: string;

  @ApiProperty({ example: 'Support123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Asosiy Direction ID (orqaga muvofiqligi)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  directionId?: number;

  @ApiPropertyOptional({ example: [1, 2, 3], description: "Ko'p yo'nalishlar ID lari" })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  directionIds?: number[];

  @ApiPropertyOptional({ example: 1, description: 'Filial ID' })
  @IsOptional()
  @IsNumber()
  branchId?: number;

  @ApiPropertyOptional({ example: 3000000, description: "Oylik maosh (so'm)" })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: "Majburiy" })
  @IsEnum(Gender)
  gender: Gender;
}
