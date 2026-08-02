import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationAudience {
  ALL = 'ALL',
  STUDENTS = 'STUDENTS',
  PARENTS = 'PARENTS',
  TEACHERS = 'TEACHERS',
  GROUP = 'GROUP',
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: "Ertaga dars bo'lmaydi" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Ertangi kun bayram munosabati bilan darslar o'tkazilmaydi." })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ enum: NotificationAudience, example: NotificationAudience.ALL })
  @IsEnum(NotificationAudience)
  audience: NotificationAudience;

  @ApiPropertyOptional({ example: 1, description: 'audience = GROUP bo\'lsa majburiy' })
  @IsOptional()
  @IsInt()
  groupId?: number;
}
