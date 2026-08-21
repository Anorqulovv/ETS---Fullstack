import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeHomeworkDto } from './dto/grade-homework.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Homework')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Uyga vazifa yaratish' })
  create(@Body() dto: CreateHomeworkDto, @Req() req: any) {
    return this.homeworkService.create(dto, req.user);
  }

  @Post('submit')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Uyga vazifani topshirish' })
  submit(@Body() dto: SubmitHomeworkDto, @Req() req: any) {
    return this.homeworkService.submit(req.user.id, dto);
  }

  @Get(':id/my-submission')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "O'zining topshirig'ini ko'rish" })
  getMySubmission(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.homeworkService.getMySubmission(id, req.user.id);
  }

  @Get(':id/submissions')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: "Vazifa bo'yicha barcha topshiriqlar" })
  getSubmissions(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.homeworkService.getSubmissions(id, req.user);
  }

  @Delete(':id/reset/:studentId')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: "O'quvchiga qayta topshirishga ruxsat berish" })
  resetSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: any,
  ) {
    return this.homeworkService.resetSubmission(id, studentId, req.user);
  }

  @Patch('submissions/:submissionId/grade')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Topshiriqni baholash' })
  grade(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() dto: GradeHomeworkDto,
    @Req() req: any,
  ) {
    return this.homeworkService.grade(submissionId, dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: "Uyga vazifalar ro'yxati" })
  findAll(@Query() query: any, @Req() req: any) {
    return this.homeworkService.findAll(req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Uyga vazifa — ID bo'yicha" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.homeworkService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Uyga vazifani tahrirlash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto, @Req() req: any) {
    return this.homeworkService.update(id, dto, req.user);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: "Uyga vazifani o'chirish" })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.homeworkService.remove(id, req.user);
  }
}
