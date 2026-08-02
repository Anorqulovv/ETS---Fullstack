import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TestType } from 'src/common/enums/test.enum';

class BankChoiceDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateBankQuestionDto {
  @IsInt()
  directionId: number;

  @IsInt()
  lessonNumber: number;

  @IsEnum(TestType)
  type: TestType;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankChoiceDto)
  choices: BankChoiceDto[];
}
