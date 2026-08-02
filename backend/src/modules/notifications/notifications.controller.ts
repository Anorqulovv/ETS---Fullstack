import { Body, Controller, Get, Param, Patch, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Xabar yuborish (hammaga, bir rolga yoki bitta guruhga)" })
  broadcast(@Req() req: any, @Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(req.user.id, dto);
  }

  @Get('my')
  findMy(@Req() req: any) {
    return this.notificationsService.findMy(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
