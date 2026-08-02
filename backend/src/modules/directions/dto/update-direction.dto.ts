import { PartialType } from '@nestjs/swagger';
import { CreateDirectionDto } from './create-direction.dto';

export class UpdateDirectionDto extends PartialType(CreateDirectionDto) {}
