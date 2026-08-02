import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from 'src/databases/entities/user.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([User])],
  providers: [UsersService, CryptoService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
