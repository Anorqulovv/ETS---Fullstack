import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Turnstile (kartadan) - admin boshqaradi
  @Post('turnstile')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Karta orqali davomat (turnstile)' })
  handleTurnstile(@Body('cardId') cardId: string) {
    return this.attendanceService.handleTurnstile(cardId);
  }

  // Qo'lda davomat - ustoz o'z guruhidagi o'quvchilar uchun
  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Qo'lda davomat qo'shish — ustoz o'z guruhidagi o'quvchilar uchun" })
  create(@Body() dto: CreateAttendanceDto, @Req() req: any) {
    return this.attendanceService.createByTeacher(dto, req.user);
  }

  // Guruh bo'yicha yo'qlama - ustoz o'z guruhini belgilaydi
  @Post('group/:groupId')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Guruh bo'yicha toplu yo'qlama — ustoz o'z guruhini belgilaydi" })
  markGroupAttendance(
    @Param('groupId') groupId: number,
    @Body() body: { attendances: { studentId: number; isPresent: boolean }[] },
    @Req() req: any,
  ) {
    return this.attendanceService.markGroupAttendance(groupId, body.attendances, req.user);
  }

  // Barcha davomatni ko'rish
  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.MANAGER)
  @ApiOperation({ summary: 'Barcha davomatlar' })
  findAll(@Req() req: any) {
    return this.attendanceService.findAll(req.user);
  }

  // O'z davomatini ko'rish - STUDENT
  @Get('my')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "O'z davomati — o'quvchi uchun" })
  getMyAttendance(@Req() req: any) {
    return this.attendanceService.findByStudentUserId(req.user.id);
  }

  // Guruh davomati - ustoz
  @Get('group/:groupId')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MANAGER)
  @ApiOperation({ summary: "Guruh davomati ko'rish" })
  getGroupAttendance(@Param('groupId') groupId: number, @Req() req: any) {
    return this.attendanceService.getGroupAttendance(groupId, req.user);
  }

  // ID bo'yicha ko'rish
  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MANAGER)
  @ApiOperation({ summary: "ID bo'yicha davomat" })
  findOne(@Param('id') id: number) {
    return this.attendanceService.findOne(id);
  }
}
