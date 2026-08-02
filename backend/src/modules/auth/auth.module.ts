import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from 'src/databases/entities/user.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { TokenService } from 'src/infrastructure/helpers/Token';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    OtpModule,
  ],
  providers: [AuthService, CryptoService, TokenService],
  controllers: [AuthController],
  exports: [AuthService, TokenService, CryptoService],
})
export class AuthModule {}
