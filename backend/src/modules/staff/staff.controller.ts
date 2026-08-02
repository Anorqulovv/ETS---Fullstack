import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const MANAGE_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN];

@ApiTags('Managers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('managers')
export class ManagersController {
  constructor(private readonly service: StaffService) {}
  @Post() @AccessRoles(...MANAGE_ROLES) create(@Body() dto: CreateStaffDto) {
    return this.service.create(UserRole.MANAGER, dto);
  }
  @Get() @AccessRoles(...MANAGE_ROLES) findAll() {
    return this.service.findAll(UserRole.MANAGER);
  }
  @Get(':id') @AccessRoles(...MANAGE_ROLES) findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(UserRole.MANAGER, id);
  }
  @Patch(':id') @AccessRoles(...MANAGE_ROLES) update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.service.update(UserRole.MANAGER, id, dto);
  }
  @Delete(':id') @AccessRoles(UserRole.SUPERADMIN) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(UserRole.MANAGER, id);
  }
}

@ApiTags('Marketing')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly service: StaffService) {}
  @Post() @AccessRoles(...MANAGE_ROLES) create(@Body() dto: CreateStaffDto) {
    return this.service.create(UserRole.MARKETING, dto);
  }
  @Get() @AccessRoles(...MANAGE_ROLES) findAll() {
    return this.service.findAll(UserRole.MARKETING);
  }
  @Get(':id') @AccessRoles(...MANAGE_ROLES) findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(UserRole.MARKETING, id);
  }
  @Patch(':id') @AccessRoles(...MANAGE_ROLES) update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.service.update(UserRole.MARKETING, id, dto);
  }
  @Delete(':id') @AccessRoles(UserRole.SUPERADMIN) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(UserRole.MARKETING, id);
  }
}

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly service: StaffService) {}
  @Post() @AccessRoles(...MANAGE_ROLES) create(@Body() dto: CreateStaffDto) {
    return this.service.create(UserRole.SALES, dto);
  }
  @Get() @AccessRoles(...MANAGE_ROLES) findAll() {
    return this.service.findAll(UserRole.SALES);
  }
  @Get(':id') @AccessRoles(...MANAGE_ROLES) findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(UserRole.SALES, id);
  }
  @Patch(':id') @AccessRoles(...MANAGE_ROLES) update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.service.update(UserRole.SALES, id, dto);
  }
  @Delete(':id') @AccessRoles(UserRole.SUPERADMIN) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(UserRole.SALES, id);
  }
}

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: StaffService) {}
  @Post() @AccessRoles(...MANAGE_ROLES) create(@Body() dto: CreateStaffDto) {
    return this.service.create(UserRole.FINANCE, dto);
  }
  @Get() @AccessRoles(...MANAGE_ROLES) findAll() {
    return this.service.findAll(UserRole.FINANCE);
  }
  @Get(':id') @AccessRoles(...MANAGE_ROLES) findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(UserRole.FINANCE, id);
  }
  @Patch(':id') @AccessRoles(...MANAGE_ROLES) update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.service.update(UserRole.FINANCE, id, dto);
  }
  @Delete(':id') @AccessRoles(UserRole.SUPERADMIN) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(UserRole.FINANCE, id);
  }
}
