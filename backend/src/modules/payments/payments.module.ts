import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from 'src/databases/entities/payment.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { Group } from 'src/databases/entities/group.entity';
import { PaymentSettings } from 'src/databases/entities/payment-settings.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Payment, Student, Parent, Group, PaymentSettings]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
