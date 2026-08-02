import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsStrongPassword, Matches, MinLength } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';
import { Gender } from 'src/common/enums/gender.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Ali Karimov', description: "To'liq ism" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'ali_karimov', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username faqat harf, raqam, nuqta, _ va - dan iborat bo\'lishi kerak',
  })
  username: string;

  @ApiProperty({ example: '+998991112233', description: 'Telefon raqami' })
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone: string;

  @ApiProperty({ example: 'Password123!', description: 'Parol (min 6 belgi)' })
  @MinLength(6)
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Telegram ID' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  // Bitta yo'nalish (orqaga muvofiqligi)
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

  @ApiPropertyOptional({ enum: UserRole, description: 'Foydalanuvchi roli (faqat /users endpointida kerak)' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: "Majburiy" })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ example: 5000000, description: "Oylik maosh (so'm)" })
  @IsOptional()
  @IsNumber()
  salary?: number;
}
