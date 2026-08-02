import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/databases/entities/user.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([User])],
  controllers: [AdminController],
  providers: [AdminService, CryptoService],
  exports: [AdminService],
})
export class AdminModule {}
