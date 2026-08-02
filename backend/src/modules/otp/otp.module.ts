import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { User } from 'src/databases/entities/user.entity';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), TelegramModule],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
