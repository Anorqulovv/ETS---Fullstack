import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from 'src/databases/entities/student.entity';
import { PointsLog } from 'src/databases/entities/points-log.entity';
import { ShopItem } from 'src/databases/entities/shop-item.entity';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([Student, PointsLog, ShopItem])],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
