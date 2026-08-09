import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum, IsNumber, IsOptional, IsString, IsStrongPassword, Matches, ValidateNested,
} from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

// Parent maydonlari — ichida nested object sifatida
export class UpdateParentInStudentDto {
  @ApiPropertyOptional({ example: 'Karim Karimov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;

  @ApiPropertyOptional({ example: '+998901234568', description: 'Ikkinchi telefon raqami (ixtiyoriy)' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "phone2 +998XXXXXXXXX formatida bo'lishi kerak" })
  phone2?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: 'karim_karimov' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'Password123!' })
  @IsOptional()
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: "Parol kuchli bo'lishi kerak: kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi" },
  )
  password?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

export class UpdateStudentDto {
  // Student-specific fields
  @ApiPropertyOptional({ example: 'CARD456' })
  @IsOptional()
  @IsString()
  cardId?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  groupId?: number;

  // User fields
  @ApiPropertyOptional({ example: 'Ali Karimov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'ali_karimov' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: "Parol kuchli bo'lishi kerak: kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi" },
  )
  password?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // Parent fields — ixtiyoriy, nested object
  @ApiPropertyOptional({ type: UpdateParentInStudentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateParentInStudentDto)
  parent?: UpdateParentInStudentDto;

  @ApiPropertyOptional({ example: 1 })

  @IsOptional()

  @IsNumber()

  branchId?: number;
}
