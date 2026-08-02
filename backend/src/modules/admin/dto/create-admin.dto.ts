import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Matches, MinLength, IsStrongPassword, IsEnum } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

export class CreateAdminDto {
  @ApiProperty({ example: 'Sardor Adminov' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'sardor_admin' })
  @IsString() @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username noto\'g\'ri format' })
  username: string;

  @ApiProperty({ example: '+998901112233' })
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo\'lishi kerak' })
  phone: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsStrongPassword()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional() @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Direction ID' })
  @IsOptional() @IsNumber()
  directionId?: number;

  @ApiPropertyOptional({ example: 5000000, description: "Oylik maosh (so'm)" })
  @IsOptional() @IsNumber()
  salary?: number;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: "Majburiy" })
  @IsEnum(Gender)
  gender: Gender;
}
