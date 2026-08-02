import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SetStudentDiscountDto {
  @ApiPropertyOptional({
    example: 15,
    description:
      "Shu o'quvchiga xos, kursni to'liq to'laganda beriladigan chegirma (%) — berilmasa, umumiy standart qiymat ishlatiladi",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fullPaymentDiscountPercent?: number;

  @ApiPropertyOptional({
    example: 5,
    description: "Shu o'quvchiga xos, oylik to'lovlarga beriladigan chegirma (%)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  monthlyDiscountPercent?: number;
}
