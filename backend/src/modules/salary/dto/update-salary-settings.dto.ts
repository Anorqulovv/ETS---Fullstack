import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateSalarySettingsDto {
  @ApiProperty({ example: 50000, description: "1 dars uchun standart o'qituvchi to'lovi (so'm)" })
  @IsInt()
  @Min(0)
  teacherPerLessonRate: number;

  @ApiProperty({ example: 30000, description: "1 dars uchun standart support to'lovi (so'm)" })
  @IsInt()
  @Min(0)
  supportPerLessonRate: number;
}
