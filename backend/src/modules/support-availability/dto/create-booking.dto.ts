import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, Matches } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  supportId: number;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '14:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Vaqt formati noto'g'ri, masalan: 14:00" })
  startTime: string;

  @ApiProperty({ example: 30, enum: [30, 60] })
  @IsIn([30, 60])
  durationMinutes: number;
}
