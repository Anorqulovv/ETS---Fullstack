import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { SupportAvailabilityService } from './support-availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Support Availability')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('support-availability')
export class SupportAvailabilityController {
  constructor(private readonly service: SupportAvailabilityService) {}

  @Post()
  @AccessRoles(UserRole.SUPPORT)
  @ApiOperation({ summary: "Bo'sh vaqt oynasi qo'shish" })
  create(@Body() dto: CreateAvailabilityDto, @Req() req: any) {
    return this.service.createAvailability(dto, req.user);
  }

  @Get('my')
  @AccessRoles(UserRole.SUPPORT)
  @ApiOperation({ summary: "O'zining bo'sh vaqt oynalari" })
  getMy(@Req() req: any) {
    return this.service.getMyAvailability(req.user.id);
  }

  @Delete('bookings/:id')
  @AccessRoles(UserRole.STUDENT, UserRole.SUPPORT)
  @ApiOperation({ summary: "Bandlikni bekor qilish" })
  cancelBooking(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cancelBooking(id, req.user);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPPORT, UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Bo'sh vaqt oynasini o'chirish" })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.removeAvailability(id, req.user);
  }

  @Get('by-date')
  @AccessRoles(UserRole.STUDENT, UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Berilgan kunda bo'sh supportlar ro'yxati" })
  getByDate(@Query('date') date: string) {
    return this.service.getAvailableSupportsForDate(date);
  }

  @Get('bookings/my')
  @AccessRoles(UserRole.STUDENT, UserRole.SUPPORT)
  @ApiOperation({ summary: "O'zining bandliklari" })
  myBookings(@Req() req: any) {
    return req.user.role === UserRole.SUPPORT
      ? this.service.getMyBookingsAsSupport(req.user.id)
      : this.service.getMyBookingsAsStudent(req.user.id);
  }

  @Get(':supportId/slots')
  @AccessRoles(UserRole.STUDENT, UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Bitta support uchun bo'sh slotlar" })
  getSlots(@Param('supportId', ParseIntPipe) supportId: number, @Query('date') date: string) {
    return this.service.getFreeSlots(supportId, date);
  }

  @Post('bookings')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "Support vaqtini band qilish" })
  book(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.service.createBooking(dto, req.user);
  }
}
