import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { PermissionsService } from './permissions.service';
import { GrantRolesDto } from './dto/grant-roles.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get('users')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary:
      "Barcha (superadmindan tashqari) foydalanuvchilar ro'yxati — ularning asosiy roli va qo'shimcha berilgan huquqlari bilan",
  })
  listGrantable() {
    return this.service.listGrantable();
  }

  @Patch('users/:id')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary:
      "Foydalanuvchiga qo'shimcha rol huquqlarini berish/olib tashlash (masalan support xodimiga teacher huquqi)",
  })
  grantRoles(@Param('id', ParseIntPipe) id: number, @Body() dto: GrantRolesDto) {
    return this.service.grantRoles(id, dto);
  }
}
