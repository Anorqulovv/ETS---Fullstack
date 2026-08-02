import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, IsNumber, Matches, MinLength, IsStrongPassword, IsEnum } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Alisher Usmonov' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'alisher_teacher' })
  @IsString() @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username noto\'g\'ri format' })
  username: string;

  @ApiProperty({ example: '+998903334455' })
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone: string;

  @ApiProperty({ example: 'Teacher123!' })
  @MinLength(6)
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional() @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Asosiy Direction ID (orqaga muvofiqligi)' })
  @IsOptional() @IsNumber()
  directionId?: number;

  @ApiPropertyOptional({ example: [1, 2, 3], description: "Ko'p yo'nalishlar ID lari" })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  directionIds?: number[];

  @ApiPropertyOptional({ example: 1, description: 'Filial ID' })
  @IsOptional() @IsNumber()
  branchId?: number;

  @ApiPropertyOptional({ example: 3000000, description: "Oylik maosh (so'm)" })
  @IsOptional() @IsNumber()
  salary?: number;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: "Majburiy" })
  @IsEnum(Gender)
  gender: Gender;
}
