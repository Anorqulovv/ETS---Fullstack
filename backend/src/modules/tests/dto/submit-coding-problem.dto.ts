import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitCodingProblemDto {
  @IsInt()
  problemId: number;

  // Qaysi test bo'yicha yechilyapti — natijani shu testning joriy urinishiga bog'lash uchun
  @IsInt()
  testId: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  language?: string;
}
