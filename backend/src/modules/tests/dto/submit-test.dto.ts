import { IsNumber, IsObject } from 'class-validator';

export class SubmitTestDto {
  @IsNumber()
  testId: number;

  @IsObject()
  answers: Record<number, number>;  
}