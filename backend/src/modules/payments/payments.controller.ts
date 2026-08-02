import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PayFullDto } from './dto/pay-full.dto';
import { PayMonthlyDto } from './dto/pay-monthly.dto';
import { PayRemainderDto } from './dto/pay-remainder.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { SetStudentDiscountDto } from './dto/set-student-discount.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AccessRoles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // To'lov qayd qilish — admin/support markazda naqd/karta orqali qabul qilingan to'lovni yozadi
  @Post()
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT, UserRole.SALES)
  @ApiOperation({ summary: "Yangi to'lov qayd qilish (erkin summa)" })
  create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    return this.paymentsService.create(dto, req.user);
  }

  // ==================== KURS TO'LOVI (narx/davomiylik/chegirma) ====================

  @Get('settings')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT, UserRole.SALES, UserRole.FINANCE)
  @ApiOperation({ summary: "To'lov sozlamalari (standart to'liq-to'lov chegirmasi)" })
  getSettings() {
    return this.paymentsService.getSettings();
  }

  @Patch('settings')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: "Standart to'liq-to'lov chegirmasini o'zgartirish" })
  updateSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.updateSettings(dto);
  }

  @Patch('student-discount/:studentId')
  @AccessRoles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: "Bitta o'quvchiga xos chegirma belgilash (to'liq/oylik)" })
  setStudentDiscount(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: SetStudentDiscountDto,
  ) {
    return this.paymentsService.setStudentDiscount(studentId, dto);
  }

  @Get('balance/:studentId')
  @AccessRoles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.SUPPORT,
    UserRole.TEACHER,
    UserRole.SALES,
    UserRole.FINANCE,
  )
  @ApiOperation({ summary: "O'quvchining balansi: narx, chegirma, qarzdorlik" })
  getBalance(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.paymentsService.getBalance(studentId);
  }

  @Get('my-balance')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "O'zining balansi — o'quvchi uchun" })
  getMyBalance(@Req() req: any) {
    return this.paymentsService.getMyBalance(req.user.id);
  }

  @Post('pay-full')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT, UserRole.SALES)
  @ApiOperation({ summary: "Kursni bir martada, to'liq (chegirmali) narxda to'lash" })
  payFull(@Body() dto: PayFullDto, @Req() req: any) {
    return this.paymentsService.payFull(dto, req.user);
  }

  @Post('pay-monthly')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT, UserRole.SALES)
  @ApiOperation({ summary: "Bitta oy uchun to'lov" })
  payMonthly(@Body() dto: PayMonthlyDto, @Req() req: any) {
    return this.paymentsService.payMonthly(dto, req.user);
  }

  @Post('pay-remainder')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT, UserRole.SALES)
  @ApiOperation({ summary: "Qolgan (<=3) oyni bir martada to'lash" })
  payRemainder(@Body() dto: PayRemainderDto, @Req() req: any) {
    return this.paymentsService.payRemainder(dto, req.user);
  }

  // ==================== RO'YXAT / STATISTIKA ====================

  // Barcha to'lovlar — filtr va sahifalash bilan
  @Get()
  @AccessRoles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.SUPPORT,
    UserRole.TEACHER,
    UserRole.SALES,
    UserRole.FINANCE,
  )
  @ApiOperation({
    summary:
      "To'lovlar ro'yxati (filtr: studentId, groupId, status, method, month, page, limit)",
  })
  findAll(@Req() req: any, @Query() query: any) {
    return this.paymentsService.findAll(req.user, query);
  }

  // Umumiy statistika — tushum, holat bo'yicha taqsimot
  @Get('summary')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES)
  @ApiOperation({ summary: "To'lovlar statistikasi (jami tushum va h.k.)" })
  getSummary(@Query() query: any) {
    return this.paymentsService.getSummary(query);
  }

  // O'quvchining o'zi — o'z to'lovlarini ko'radi
  @Get('my')
  @AccessRoles(UserRole.STUDENT)
  @ApiOperation({ summary: "O'zining to'lovlari — o'quvchi uchun" })
  getMyPayments(@Req() req: any) {
    return this.paymentsService.findMyPayments(req.user.id);
  }

  // Ota-ona — farzandlari to'lovlarini ko'radi
  @Get('children')
  @AccessRoles(UserRole.PARENT)
  @ApiOperation({ summary: "Farzandlar to'lovlari — ota-ona uchun" })
  getChildrenPayments(@Req() req: any) {
    return this.paymentsService.findChildrenPayments(req.user.id);
  }

  @Get(':id')
  @AccessRoles(
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.SUPPORT,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: "ID bo'yicha to'lov" })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.paymentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "To'lovni yangilash" })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Delete(':id')
  @AccessRoles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "To'lovni o'chirish" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}
