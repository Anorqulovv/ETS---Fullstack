import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Admin yaratish — faqat SUPERADMIN' })
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Barcha adminlar' })
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin — ID boyicha' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Admin yangilash — faqat SUPERADMIN' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminDto) {
    return this.adminService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Admin ochirish — faqat SUPERADMIN' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.remove(id);
  }
}
