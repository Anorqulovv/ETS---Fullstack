import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { StudentsService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Bir API call bilan user+student yaratish (asosiy endpoint)
  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(
    @Body('user') userDto: CreateUserDto,
    @Body('student') studentDto: Omit<CreateStudentDto, 'userId'>,
    @Body('parent') parentDto?: any,
  ) {
    return this.studentsService.createWithUser(userDto, studentDto, parentDto);
  }

  // Mavjud user uchun student profil qo'shish
  @Post('link-user')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  linkUser(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  // Superadmin va Admin: o'quvchilar + ota-onalari ID lari bilan
  @Get('with-parents')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAllWithParentIds() {
    return this.studentsService.findAllWithParentIds();
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT, UserRole.MANAGER, UserRole.MARKETING, UserRole.SALES, UserRole.FINANCE)
  findAll(@Req() req: any) {
    return this.studentsService.findAll(req.user);
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.SUPPORT,UserRole.STUDENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
