import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @ApiProperty({ example: 10, description: "Kursni birdaniga to'liq to'laganda beriladigan standart chegirma (%)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  fullPaymentDiscountPercent: number;
}
