import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from 'src/common/enums/role.enum';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@UseGuards(AuthGuard, RolesGuard)
@AccessRoles(UserRole.SUPERADMIN)   // Faqat SUPERADMIN barcha ushbu endpointlarga kira oladi
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ==================== CREATE ====================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    // role body dan keladi (CreateUserDto da role maydoni bor)
    const role = (dto as any).role as UserRole;
    if (!role) {
      throw new BadRequestException('role maydoni talab qilinadi');
    }
    return this.usersService.createUser(dto, role);
  }

  // ==================== READ ====================
  @Get()
  findAll(@Query() query: any) {
    if (query?.role) {
      return this.usersService.findAllByRole(query.role, query);
    }
    return this.usersService.findAllUsers(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneById(id); // BaseService'dan keladi
  }

  // Role bo'yicha bitta user topish (qo‘shimcha qulaylik)
  @Get('role/:role/:id')
  findOneByRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.findOneByRole(id, role);
  }

  // ==================== UPDATE ====================
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  // ==================== DELETE ====================
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeUser(id);
  }

  // ==================== DASHBOARD STATS ====================
  @Get('stats/dashboard')
  getDashboardStats() {
    return this.usersService.getDashboardStats();
  }
}