import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('supports')
export class SupportController {
  constructor(private readonly supportService: SupportService) { }

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Support yaratish' })
  create(@Body() dto: CreateSupportDto) {
    return this.supportService.create(dto);
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN,UserRole.TEACHER)
  @ApiOperation({ summary: 'Barcha supportlar' })
  findAll(@Query() query: any) {
    return this.supportService.findAll(query);
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Support — ID boyicha' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Support yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupportDto) {
    return this.supportService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Support ochirish' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.remove(id);
  }
}
