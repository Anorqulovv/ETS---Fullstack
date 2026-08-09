import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CancelLessonDto } from './dto/cancel-lesson.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) { }

  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.STUDENT, UserRole.MANAGER, UserRole.MARKETING, UserRole.SALES, UserRole.FINANCE, UserRole.HR)
  findAll(@Req() req: any, @Query() query: any) {
    return this.groupsService.findAll(req.user, query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      throw new BadRequestException('ID noto\'g\'ri formatda');
    }

    return this.groupsService.findOneWithStudents(parsedId);
  }


  @Get(':id/details')
  getDetails(@Param('id') id: number) {
    return this.groupsService.findOneWithStudents(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(@Param('id') id: number, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Patch(':id/status')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.groupsService.updateStatus(id, status as any);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(@Param('id') id: number) {
    return this.groupsService.delete(id);
  }

  @Get(':id/score')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getGroupScore(@Param('id') id: number) {
    return this.groupsService.getGroupScore(id);
  }

  @Post(':id/cancel-lesson')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  cancelLesson(@Param('id') id: number, @Body() dto: CancelLessonDto, @Req() req: any) {
    return this.groupsService.cancelLesson(Number(id), dto, req.user?.id);
  }

  @Get(':id/cancelled-lessons')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.STUDENT)
  listCancelledLessons(@Param('id') id: number) {
    return this.groupsService.listCancelledLessons(Number(id));
  }
}
