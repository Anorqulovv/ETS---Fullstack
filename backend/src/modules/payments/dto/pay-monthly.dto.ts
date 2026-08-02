import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { PaymentMethod } from 'src/common/enums/paymentMethod.enum';

export class PayMonthlyDto {
  @ApiProperty({ example: 10, description: "O'quvchi ID" })
  @IsNumber()
  studentId: number;

  @ApiPropertyOptional({ example: 3, description: "Guruh ID (berilmasa, o'quvchining joriy guruhi olinadi)" })
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @ApiProperty({ example: '2026-07', description: "To'lanayotgan oy (YYYY-MM)" })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month YYYY-MM formatida bo\'lishi kerak' })
  month: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
