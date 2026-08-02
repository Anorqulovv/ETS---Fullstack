import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

export class UpdateParentDto {
  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  studentId?: number;

  @ApiPropertyOptional({ example: '+998901234568', description: 'Ikkinchi telefon raqami (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'phone2 +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone2?: string;

  // Quyidagilar aslida Parent emas, uning User yozuvidagi maydonlar — ParentsService.update()
  // buni avtomatik ajratib, UsersService.updateUser() orqali yangilaydi.
  @ApiPropertyOptional({ example: 'Karim Karimov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'karim_karimov' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Telegram ID — botga ulanish uchun' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
