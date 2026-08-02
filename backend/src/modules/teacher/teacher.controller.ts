import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Teacher yaratish — SUPERADMIN, ADMIN' })
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.MANAGER, UserRole.MARKETING) // ← qo'shildi
  @ApiOperation({ summary: 'Barcha teacherlar (name, directionId filter)' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'directionId', required: false })
  findAll(@Query() query: any) {
    return this.teacherService.findAll(query);
  }


  @Get('my-groups')
  @AccessRoles(UserRole.TEACHER)
  @ApiOperation({ summary: "O'z guruhlari — faqat TEACHER" })
  getMyGroups(@Req() req: any) {
    return this.teacherService.getMyGroups(req.user.id);
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Teacher — ID boyicha' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teacherService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Teacher yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Teacher ochirish' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teacherService.remove(id);
  }
}
