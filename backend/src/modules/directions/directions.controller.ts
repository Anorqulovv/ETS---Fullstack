import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { DirectionService } from './directions.service';
import { CreateDirectionDto } from './dto/create-direction.dto';
import { UpdateDirectionDto } from './dto/update-direction.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('directions')
export class DirectionController {
  constructor(private readonly directionService: DirectionService) { }

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateDirectionDto) {
    return this.directionService.create(dto);
  }

  @Get()
  findAll(@Query('name') name?: string) {
    return this.directionService.findAll(name)
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.MANAGER, UserRole.MARKETING, UserRole.SALES, UserRole.FINANCE)
  findOne(@Param('id') id: number) {
    return this.directionService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(@Param('id') id: number, @Body() dto: UpdateDirectionDto) {
    return this.directionService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(@Param('id') id: number) {
    return this.directionService.remove(id);
  }
}