import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Direction } from 'src/databases/entities/direction.entity';
import { DirectionController } from './directions.controller';
import { DirectionService } from './directions.service';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([Direction])],
  controllers: [DirectionController],
  providers: [DirectionService],
  exports: [DirectionService],
})
export class DirectionModule {}