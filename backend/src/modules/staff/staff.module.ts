import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/databases/entities/user.entity';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { StaffService } from './staff.service';
import {
  FinanceController,
  ManagersController,
  MarketingController,
  SalesController,
} from './staff.controller';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([User])],
  controllers: [ManagersController, MarketingController, SalesController, FinanceController],
  providers: [StaffService, CryptoService],
})
export class StaffModule {}
