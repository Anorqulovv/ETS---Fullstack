import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { GamificationService } from './gamification.service';
import { AwardPointsDto } from './dto/award-points.dto';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

  @Get('my')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "O'zim to'plagan ballar va tarix" })
  getMyPoints(@Req() req: any) {
    // req.user.id — bu userId, lekin ballar Student yozuviga bog'langan.
    // GamificationService studentId kutadi, shu sabab avval studentni topamiz.
    return this.service.getMyPointsByUserId(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: "Reyting — eng ko'p ball to'plagan o'quvchilar" })
  getLeaderboard(@Query('groupId') groupId?: string, @Query('limit') limit?: string) {
    return this.service.getLeaderboard({
      groupId: groupId ? Number(groupId) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ==================== QO'LDA BALL QO'SHISH ====================

  @Post('award')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "O'quvchiga qo'lda ball qo'shish (yoki ayirish)" })
  award(@Body() dto: AwardPointsDto) {
    return this.service.award(dto.studentId, dto.amount, dto.note);
  }

  // ==================== DO'KON (SHOP) ====================

  @Get('shop')
  @ApiOperation({ summary: "Do'kon mahsulotlari ro'yxati" })
  listShop(@Req() req: any, @Query('all') all?: string) {
    const isStaff = req.user?.role !== UserRole.STUDENT;
    return this.service.listShopItems(isStaff && all === 'true');
  }

  @Post('shop')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Do'konga mahsulot qo'shish" })
  createShopItem(@Body() dto: CreateShopItemDto) {
    return this.service.createShopItem(dto);
  }

  @Patch('shop/:id')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Mahsulotni yangilash" })
  updateShopItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShopItemDto) {
    return this.service.updateShopItem(id, dto);
  }

  @Delete('shop/:id')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Mahsulotni o'chirish" })
  removeShopItem(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeShopItem(id);
  }

  @Post('shop/:id/purchase')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "Mahsulotni ballarga sotib olish" })
  purchase(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.purchaseByUserId(req.user.id, id);
  }
}
