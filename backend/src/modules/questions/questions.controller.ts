import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { TestType } from 'src/common/enums/test.enum';

@ApiTags('Questions')
@UseGuards(AuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Yangi savol qo'shish (variantlar bilan birga)
   * Superadmin, Admin, Teacher qo'sha oladi
   */
  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Savol va variantlar qo\'shish' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  /**
   * Barcha savollar — testId yoki type bo'yicha filter
   */
  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Barcha savollarni olish (filter: testId, type)' })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TestType })
  findAll(
    @Query('testId') testId?: number,
    @Query('type') type?: TestType,
  ) {
    return this.questionsService.findAll(testId ? Number(testId) : undefined, type);
  }

  /**
   * Kunlik savollar
   */
  @Get('daily')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Kunlik test savollari' })
  findDaily() {
    return this.questionsService.findByType(TestType.DAILY);
  }

  /**
   * Haftalik savollar
   */
  @Get('weekly')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Haftalik test savollari' })
  findWeekly() {
    return this.questionsService.findByType(TestType.WEEKLY);
  }

  /**
   * Oylik savollar
   */
  @Get('monthly')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Oylik test savollari' })
  findMonthly() {
    return this.questionsService.findByType(TestType.MONTHLY);
  }

  /**
   * Bitta savol — ID bo'yicha
   */
  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Bitta savolni olish' })
  findOne(@Param('id') id: number) {
    return this.questionsService.findOne(Number(id));
  }

  /**
   * Savolni yangilash
   */
  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Savolni va variantlarini yangilash' })
  update(@Param('id') id: number, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(Number(id), dto);
  }

  /**
   * Savolni o'chirish — faqat superadmin va admin
   */
  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Savolni o\'chirish' })
  remove(@Param('id') id: number) {
    return this.questionsService.remove(Number(id));
  }
}
