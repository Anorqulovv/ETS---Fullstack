import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateChoiceDto {
  @ApiProperty({ example: 'Paris', description: 'Variant matni' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: true, description: 'Bu variant to\'g\'rimi?' })
  @IsBoolean()
  isCorrect: boolean;
}
