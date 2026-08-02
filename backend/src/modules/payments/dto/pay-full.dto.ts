import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PaymentMethod } from 'src/common/enums/paymentMethod.enum';

export class PayFullDto {
  @ApiProperty({ example: 10, description: "O'quvchi ID" })
  @IsNumber()
  studentId: number;

  @ApiPropertyOptional({ example: 3, description: "Guruh ID (berilmasa, o'quvchining joriy guruhi olinadi)" })
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
