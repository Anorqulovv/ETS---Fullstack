import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendNotificationDto {
  @ApiPropertyOptional({ example: '123456789', description: 'Telegram ID' })
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @ApiPropertyOptional({ example: 'Hello!', description: 'Message text' })
  @IsString()
  @IsNotEmpty()
  message: string;
}