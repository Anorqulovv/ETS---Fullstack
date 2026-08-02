import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsStrongPassword, IsEnum } from 'class-validator';
import { Gender } from 'src/common/enums/gender.enum';

export class CreateStaffDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'aziz.manager' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsStrongPassword()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiProperty({ required: false, example: 4000000, description: "Oylik maosh (so'm)" })
  @IsOptional()
  @IsInt()
  salary?: number;

  @ApiProperty({ enum: Gender, example: Gender.MALE, description: "Majburiy" })
  @IsEnum(Gender)
  gender: Gender;
}
