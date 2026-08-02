import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { AddScoreDto } from './dto/add-score.dto';

import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { SubmitTestDto } from './dto/submit-test.dto';
import { GenerateMonthlyTestsDto } from './dto/generate-monthly-tests.dto';
import { CreateBankQuestionDto } from './dto/create-bank-question.dto';
import { AiGenerateTestDto } from './dto/ai-generate-test.dto';
import { TestType } from '../../common/enums/test.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) { }


  @Post('bank/questions')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  createBankQuestion(@Body() dto: CreateBankQuestionDto) {
    return this.testsService.createBankQuestion(dto);
  }

  @Get('bank/questions')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getBankQuestions(
    @Query('directionId') directionId?: string,
    @Query('lessonNumber') lessonNumber?: string,
    @Query('type') type?: TestType,
  ) {
    return this.testsService.getBankQuestions(
      directionId ? Number(directionId) : undefined,
      lessonNumber ? Number(lessonNumber) : undefined,
      type,
    );
  }

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  create(@Body() dto: CreateTestDto, @Req() req: any) {
    return this.testsService.create(dto, req.user);
  }


  @Post('generate-monthly-schedule')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  generateMonthlySchedule(@Body() dto: GenerateMonthlyTestsDto, @Req() req: any) {
    return this.testsService.generateMonthlySchedule(dto, req.user);
  }


  @Post('ai-generate')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  aiGenerateTest(@Body() dto: AiGenerateTestDto, @Req() req: any) {
    return this.testsService.aiGenerateTest(dto, req.user);
  }


  @Get('parent/children-analytics')
  @AccessRoles(UserRole.PARENT)
  getParentChildrenAnalytics(@Req() req: any) {
    return this.testsService.getParentChildrenAnalytics(req.user);
  }

  @Get('student/:studentId/analytics')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getStudentAnalytics(@Param('studentId', ParseIntPipe) studentId: number, @Req() req: any) {
    return this.testsService.getStudentAnalytics(studentId, req.user);
  }


  @Post(':testId/start')
  @AccessRoles(UserRole.STUDENT)
  startTest(@Req() req: any, @Param('testId', ParseIntPipe) testId: number) {
    return this.testsService.startTest(req.user.id, testId);
  }

  @Post(':testId/violation')
  @AccessRoles(UserRole.STUDENT)
  markViolation(
    @Req() req: any,
    @Param('testId', ParseIntPipe) testId: number,
    @Body('reason') reason: string,
  ) {
    return this.testsService.markViolation(req.user.id, testId, reason);
  }

  @Post('submit')
  @AccessRoles(UserRole.STUDENT)
  async submit(@Req() req: any, @Body() dto: SubmitTestDto) {
    return this.testsService.submitTest(req.user.id, dto.testId, dto.answers);
  }

  @Get()
  @AccessRoles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.SUPPORT,
    UserRole.STUDENT,
  )
  findAll(@Req() req: any) {
    return this.testsService.findAll(req.user);
  }


  @Get(':testId/student/:studentId/review')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getStudentTestReview(
    @Param('testId', ParseIntPipe) testId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: any,
  ) {
    return this.testsService.getStudentTestReview(testId, studentId, req.user);
  }

  @Get(':id')
  @AccessRoles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.SUPPORT,
    UserRole.STUDENT,
  )
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.testsService.findOne(id, req.user);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTestDto) {
    return this.testsService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.testsService.remove(id, req.user);
  }

  @Post('score')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  addScore(@Body() dto: AddScoreDto) {
    return this.testsService.addScore(dto);
  }

  // Ustoz o'quvchiga testni qayta ishlashga ruxsat beradi (natija arxivlanadi)
  @Delete(':testId/reset/:studentId')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  resetAttempt(
    @Param('testId', ParseIntPipe) testId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: any,
  ) {
    return this.testsService.resetTestAttempt(req.user, studentId, testId);
  }

  // O'quvchining barcha urinishlari tarixi (admin/ustoz uchun)
  @Get('student/:studentId/history')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getStudentHistory(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.testsService.getStudentTestHistory(studentId);
  }
}
