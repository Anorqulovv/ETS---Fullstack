import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/databases/entities/user.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([User])],
  controllers: [SupportController],
  providers: [SupportService, CryptoService],
  exports: [SupportService],
})
export class SupportModule {}
