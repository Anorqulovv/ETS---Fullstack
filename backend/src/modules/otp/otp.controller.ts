import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @ApiOperation({ summary: 'Telegram orqali OTP yuborish (phone raqami bo\'yicha)' })
  send(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  @Post('verify')
  @ApiOperation({ summary: 'OTP kodni tekshirish' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.code);
  }
}
