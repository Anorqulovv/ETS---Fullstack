import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportAvailability } from 'src/databases/entities/support-availability.entity';
import { SupportBooking } from 'src/databases/entities/support-booking.entity';
import { Student } from 'src/databases/entities/student.entity';
import { User } from 'src/databases/entities/user.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { SupportAvailabilityController } from './support-availability.controller';
import { SupportAvailabilityService } from './support-availability.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([SupportAvailability, SupportBooking, Student, User]),
    TelegramModule,
  ],
  controllers: [SupportAvailabilityController],
  providers: [SupportAvailabilityService],
})
export class SupportAvailabilityModule {}
