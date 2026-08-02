import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsStrongPassword, Matches, MinLength } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';
import { Gender } from 'src/common/enums/gender.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ali Karimov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'ali_karimov' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username faqat harf, raqam, nuqta, _ va - dan iborat bo\'lishi kerak',
  })
  username?: string;

  @ApiPropertyOptional({ example: '+998991112233' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @MinLength(6)
  @IsStrongPassword()
  password?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @IsOptional()
  @IsNumber()
  directionId?: number;

  // Ko'p yo'nalishlar (o'qituvchi/support uchun)
  @ApiPropertyOptional({ example: [1, 2, 3], description: "Ko'p yo'nalishlar ID lari" })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  directionIds?: number[];

  @ApiPropertyOptional({ example: 1, description: 'Filial ID' })
  @IsOptional()
  @IsNumber()
  branchId?: number;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 5000000, description: "Oylik maosh (so'm)" })
  @IsOptional()
  @IsNumber()
  salary?: number;
}
