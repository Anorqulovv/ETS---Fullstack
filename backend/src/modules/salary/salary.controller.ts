import { Controller, Get, Patch, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalaryService } from './salary.service';
import { UpdateSalarySettingsDto } from './dto/update-salary-settings.dto';
import { SetUserSalaryDto } from './dto/set-user-salary.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Salary')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get('settings')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "1-dars uchun standart narxlar (o'qituvchi/support)" })
  getSettings() {
    return this.salaryService.getSettings();
  }

  @Patch('settings')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: "1-dars uchun standart narxlarni o'zgartirish" })
  updateSettings(@Body() dto: UpdateSalarySettingsDto) {
    return this.salaryService.updateSettings(dto);
  }

  @Get('overview')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Barcha o'qituvchi/support'larning shu oygi oyligi (nazorat paneli)" })
  getOverview(@Query('month') month?: string) {
    return this.salaryService.getOverview(month);
  }

  @Get('my')
  @AccessRoles(UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: "O'zining oyligi — o'qituvchi/support uchun" })
  getMy(@Req() req: any, @Query('month') month?: string) {
    return this.salaryService.computeMySalary(req.user.id, month);
  }

  @Patch('rate/:userId')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: "Bitta xodimning oylik rejimi/narxini belgilash" })
  setUserSalary(@Param('userId', ParseIntPipe) userId: number, @Body() dto: SetUserSalaryDto) {
    return this.salaryService.setUserSalary(userId, dto);
  }

  @Get(':userId')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Bitta xodimning berilgan oy uchun oyligi" })
  getOne(@Param('userId', ParseIntPipe) userId: number, @Query('month') month?: string) {
    return this.salaryService.computeSalary(userId, month);
  }
}
