import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ParentsService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  // Bir API call bilan user+parent yaratish (asosiy endpoint)
  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(@Body() userDto: CreateUserDto) {
    return this.parentsService.createWithUser(userDto);
  }

  // Mavjud user uchun parent profil qo'shish
  @Post('link-user')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  linkUser(@Body() dto: CreateParentDto) {
    return this.parentsService.create(dto);
  }

  @Get()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT)
  findAll() {
    return this.parentsService.findAll();
  }

  @Get('my-children')
  @AccessRoles(UserRole.PARENT)
  getMyChildren(@Req() req: any) {
    return this.parentsService.getMyChildren(req.user.id);
  }

  @Get(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parentsService.findOne(id);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateParentDto) {
    return this.parentsService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parentsService.remove(id);
  }
}
