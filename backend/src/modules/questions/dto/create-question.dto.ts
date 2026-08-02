import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { CreateChoiceDto } from './create-choice.dto';

export class CreateQuestionDto {
  @ApiProperty({ example: 'Fransiyaning poytaxti qaysi shahar?', description: 'Savol matni' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 1, description: 'Test ID' })
  @IsNumber()
  testId: number;

  @ApiProperty({
    type: [CreateChoiceDto],
    description: 'Variantlar (kamida 2, ko\'pi bilan 6 ta)',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices: CreateChoiceDto[];
}
