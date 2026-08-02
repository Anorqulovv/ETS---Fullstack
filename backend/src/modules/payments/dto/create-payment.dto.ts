import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from 'src/common/enums/paymentMethod.enum';
import { PaymentStatus } from 'src/common/enums/paymentStatus.enum';

export class CreatePaymentDto {
  @ApiProperty({ example: 10, description: "O'quvchi ID" })
  @IsNumber()
  studentId: number;

  @ApiPropertyOptional({ example: 3, description: 'Guruh ID (ixtiyoriy)' })
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @ApiProperty({ example: 500000, description: "To'lov summasi" })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, example: PaymentStatus.PAID })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    example: '2026-07',
    description: 'Qaysi oy uchun (YYYY-MM)',
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ example: '2026-07-16T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: "Iyul oyi uchun to'liq to'lov" })
  @IsOptional()
  @IsString()
  comment?: string;
}
