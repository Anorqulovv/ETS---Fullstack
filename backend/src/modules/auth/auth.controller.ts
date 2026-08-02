import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login';
import { AuthGuard } from 'src/common/guards/auth.guard';

class OtpRequestDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

class OtpVerifyDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ali Karimov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'ali_karimov' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: '+998991112233' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'OldPassword123!' })
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @IsString()
  newPassword?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}

class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGci...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // Brute-force himoyasi: shu IP'dan daqiqasiga 5 marta login urinishi mumkin.
  // Global standart (120/daqiqa, app.module.ts) barcha endpointlar uchun umumiy himoya,
  // lekin parol taxmin qilishning oldini olish uchun bu yerda ancha qattiqroq chegara kerak.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Username + password bilan kirish' })
  async signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Access tokenni refresh token bilan yangilash' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('otp/send')
  // OTP Telegram orqali yuboriladi — bu tashqi API chaqiruvi bo'lgani uchun ham,
  // bir raqamni SMS/Telegram bilan "bombalash"ning oldini olish uchun ham qattiq chegara.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Telegram orqali OTP yuborish' })
  async sendOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtpLogin(dto.phone);
  }

  @Post('otp/verify')
  // Kodni "taxmin qilish" (brute-force) urinishlarining oldini olish uchun.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'OTP kod bilan kirish' })
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtpLogin(dto.phone, dto.code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "O'zim haqimda — token bilan" })
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "O'z profilini yangilash va parolni o'zgartirish" })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }
}
