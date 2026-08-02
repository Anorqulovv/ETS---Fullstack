import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Faqat SUPERADMIN filial yaratadi
  @Post()
  @AccessRoles(UserRole.SUPERADMIN)
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  // Barcha rollar filiallar ro'yxatini ko'ra oladi (CustomSelect uchun kerak)
  @Get()
  findAll(@Query('name') name?: string) {
    return this.branchesService.findAll(name);
  }

  // Batafsil ko'rish — barcha autentifikatsiyalangan foydalanuvchilar
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findOne(id);
  }

  // Faqat SUPERADMIN o'zgartiradi
  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  // Faqat SUPERADMIN o'chiradi
  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.remove(id);
  }
}
