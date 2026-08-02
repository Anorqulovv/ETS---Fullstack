import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from 'src/databases/entities/payment.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { Group } from 'src/databases/entities/group.entity';
import { PaymentSettings } from 'src/databases/entities/payment-settings.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { PaymentStatus } from 'src/common/enums/paymentStatus.enum';
import { PaymentMethod } from 'src/common/enums/paymentMethod.enum';
import { PaymentKind } from 'src/common/enums/paymentKind.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PayFullDto } from './dto/pay-full.dto';
import { PayMonthlyDto } from './dto/pay-monthly.dto';
import { PayRemainderDto } from './dto/pay-remainder.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { SetStudentDiscountDto } from './dto/set-student-discount.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import {
  ISucces,
  IResponsePagination,
} from 'src/infrastructure/utils/succes-interface';

/** "2026-07" style key for a given date, in the server's local month/year. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Every "YYYY-MM" month the course spans, starting from the group's start date. */
function courseMonths(startDate: string, durationMonths: number): string[] {
  const start = new Date(startDate);
  const months: string[] = [];
  for (let i = 0; i < durationMonths; i++) {
    months.push(monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));
  }
  return months;
}

/** Of the course's months, the ones that have already started (i.e. are "owed" by now). */
function dueMonthsSoFar(startDate: string, durationMonths: number): string[] {
  const nowKey = monthKey(new Date());
  return courseMonths(startDate, durationMonths).filter((m) => m <= nowKey);
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(PaymentSettings)
    private readonly settingsRepo: Repository<PaymentSettings>,
  ) {}

  async create(dto: CreatePaymentDto, reqUser: any): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: dto.studentId },
    });
    if (!student)
      throw new NotFoundException(`O'quvchi ID ${dto.studentId} topilmadi`);

    if (dto.groupId) {
      const group = await this.groupRepo.findOne({
        where: { id: dto.groupId },
      });
      if (!group)
        throw new NotFoundException(`Guruh ID ${dto.groupId} topilmadi`);
    }

    const payment = this.paymentRepo.create({
      ...dto,
      status: dto.status ?? PaymentStatus.PAID,
      kind: PaymentKind.MANUAL,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      createdById: reqUser?.id,
    });
    const saved = await this.paymentRepo.save(payment);
    return succesRes(saved, 201);
  }

  // Ustoz/support/admin/superadmin — hammasi ko'radi, filtrlash mumkin.
  // Sahifalash: ?page=1&limit=10, filtr: ?studentId=&groupId=&status=&method=&month=
  async findAll(reqUser: any, query: any): Promise<IResponsePagination> {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;

    const where: any = {};
    if (query?.studentId) where.studentId = Number(query.studentId);
    if (query?.groupId) where.groupId = Number(query.groupId);
    if (query?.status) where.status = query.status;
    if (query?.method) where.method = query.method;
    if (query?.month) where.month = query.month;

    // TEACHER/SUPPORT faqat o'z guruhlaridagi o'quvchilar to'lovlarini ko'radi
    if (
      reqUser?.role === UserRole.TEACHER ||
      reqUser?.role === UserRole.SUPPORT
    ) {
      const groupWhere =
        reqUser.role === UserRole.TEACHER
          ? { teacherId: reqUser.id }
          : { supportId: reqUser.id };
      const groups = await this.groupRepo.find({
        where: groupWhere,
        select: ['id'],
      });
      const groupIds = groups.map((g) => g.id);
      if (!groupIds.length) {
        return this.paginate([], 0, page, limit);
      }
      const students = await this.studentRepo.find({
        where: groupIds.map((groupId) => ({ groupId })),
        select: ['id'],
      });
      const studentIds = where.studentId
        ? students.map((s) => s.id).filter((id) => id === where.studentId)
        : students.map((s) => s.id);
      if (!studentIds.length) {
        return this.paginate([], 0, page, limit);
      }
      const filterBase = { ...where };
      delete filterBase.studentId;
      const [data, count] = await this.paymentRepo.findAndCount({
        where: studentIds.map((studentId) => ({ ...filterBase, studentId })),
        relations: ['student', 'student.user', 'group'],
        order: { createdAt: 'DESC' },
        take: limit,
        skip: (page - 1) * limit,
      });
      return this.paginate(data, count, page, limit);
    }

    const [data, count] = await this.paymentRepo.findAndCount({
      where,
      relations: ['student', 'student.user', 'group'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return this.paginate(data, count, page, limit);
  }

  // STUDENT — faqat o'zining to'lovlari
  async findMyPayments(userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const data = await this.paymentRepo.find({
      where: { studentId: student.id },
      relations: ['group'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(data);
  }

  // PARENT — o'z farzandlari to'lovlari
  async findChildrenPayments(userId: number): Promise<ISucces> {
    const parent = await this.parentRepo.findOne({ where: { userId } });
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');

    const students = await this.studentRepo.find({
      where: { parentId: parent.id },
    });
    const studentIds = students.map((s) => s.id);
    if (!studentIds.length) return succesRes([]);

    const data = await this.paymentRepo.find({
      where: studentIds.map((studentId) => ({ studentId })),
      relations: ['student', 'student.user', 'group'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(data);
  }

  async findOne(id: number, reqUser?: any): Promise<ISucces> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['student', 'student.user', 'group', 'createdBy'],
    });
    if (!payment) throw new NotFoundException(`To'lov ID ${id} topilmadi`);

    if (reqUser?.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({
        where: { userId: reqUser.id },
      });
      if (!student || student.id !== payment.studentId) {
        throw new ForbiddenException(
          "Siz faqat o'z to'lovlaringizni ko'ra olasiz",
        );
      }
    }

    return succesRes(payment);
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<ISucces> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`To'lov ID ${id} topilmadi`);

    await this.paymentRepo.update(id, {
      ...dto,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
    });
    const updated = await this.paymentRepo.findOne({
      where: { id },
      relations: ['student', 'student.user', 'group'],
    });
    return succesRes(updated);
  }

  async remove(id: number): Promise<ISucces> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`To'lov ID ${id} topilmadi`);
    await this.paymentRepo.delete(id);
    return succesRes({ message: "To'lov o'chirildi" });
  }

  // Umumiy statistika: jami tushum, oy bo'yicha, holat bo'yicha
  async getSummary(query: any): Promise<ISucces> {
    const where: any = {};
    if (query?.month) where.month = query.month;
    if (query?.groupId) where.groupId = Number(query.groupId);

    const payments = await this.paymentRepo.find({ where });

    const totalAmount = payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const byStatus = {
      PAID: payments.filter((p) => p.status === PaymentStatus.PAID).length,
      UNPAID: payments.filter((p) => p.status === PaymentStatus.UNPAID).length,
      PARTIAL: payments.filter((p) => p.status === PaymentStatus.PARTIAL)
        .length,
    };

    return succesRes({
      totalAmount,
      totalPayments: payments.length,
      byStatus,
    });
  }

  // ==================== KURS NARXI / OYLIK TO'LOV / CHEGIRMA ====================

  private async getOrCreateSettings(): Promise<PaymentSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({
        id: 1,
        fullPaymentDiscountPercent: 10,
      });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async getSettings(): Promise<ISucces> {
    return succesRes(await this.getOrCreateSettings());
  }

  // SUPERADMIN — "to'liq to'laganda" beriladigan standart chegirmani o'zgartiradi
  async updateSettings(dto: UpdatePaymentSettingsDto): Promise<ISucces> {
    const settings = await this.getOrCreateSettings();
    settings.fullPaymentDiscountPercent = dto.fullPaymentDiscountPercent;
    const saved = await this.settingsRepo.save(settings);
    return succesRes(saved);
  }

  // SUPERADMIN — bitta o'quvchiga xos chegirmalarni belgilaydi (to'liq to'lov va/yoki oylik)
  async setStudentDiscount(
    studentId: number,
    dto: SetStudentDiscountDto,
  ): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
    });
    if (!student)
      throw new NotFoundException(`O'quvchi ID ${studentId} topilmadi`);

    if (dto.fullPaymentDiscountPercent !== undefined) {
      student.fullPaymentDiscountPercent = dto.fullPaymentDiscountPercent;
    }
    if (dto.monthlyDiscountPercent !== undefined) {
      student.monthlyDiscountPercent = dto.monthlyDiscountPercent;
    }
    const saved = await this.studentRepo.save(student);
    return succesRes(saved);
  }

  private async resolveStudentGroup(studentId: number, groupId?: number) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
    });
    if (!student)
      throw new NotFoundException(`O'quvchi ID ${studentId} topilmadi`);

    const gid = groupId ?? student.groupId;
    if (!gid) {
      throw new BadRequestException(
        "O'quvchi hech qanday guruhga biriktirilmagan",
      );
    }
    const group = await this.groupRepo.findOne({
      where: { id: gid },
      relations: ['direction'],
    });
    if (!group) throw new NotFoundException(`Guruh ID ${gid} topilmadi`);
    if (!group.direction?.price || !group.direction?.durationMonths) {
      throw new BadRequestException(
        "Ushbu guruh yo'nalishida kurs narxi va davomiyligi belgilanmagan",
      );
    }
    if (!group.startDate) {
      throw new BadRequestException(
        "Guruhning boshlanish sanasi belgilanmagan",
      );
    }
    return { student, group };
  }

  private async paidBreakdown(studentId: number, groupId: number) {
    const payments = await this.paymentRepo.find({
      where: { studentId, groupId, status: PaymentStatus.PAID },
    });
    const hasFullPayment = payments.some((p) => p.kind === PaymentKind.FULL);
    const paidMonths = new Set<string>();
    for (const p of payments) {
      if (p.kind === PaymentKind.MONTHLY && p.month) paidMonths.add(p.month);
      if (p.kind === PaymentKind.REMAINDER && p.monthsCovered) {
        p.monthsCovered.forEach((m) => paidMonths.add(m));
      }
    }
    return { payments, hasFullPayment, paidMonths };
  }

  // O'quvchining joriy balansi: narx, chegirma, qarzdorlik, qolgan oylar va h.k.
  async getBalance(studentId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
    });
    if (!student)
      throw new NotFoundException(`O'quvchi ID ${studentId} topilmadi`);

    if (!student.groupId) {
      return succesRes({
        studentId,
        hasCoursePricing: false,
        message: "O'quvchi hech qanday guruhga biriktirilmagan",
      });
    }

    const group = await this.groupRepo.findOne({
      where: { id: student.groupId },
      relations: ['direction'],
    });
    const direction = group?.direction;

    if (!group || !direction?.price || !direction?.durationMonths || !group.startDate) {
      return succesRes({
        studentId,
        groupId: group?.id ?? null,
        hasCoursePricing: false,
        message: "Guruh yo'nalishida narx/davomiylik yoki boshlanish sanasi belgilanmagan",
      });
    }

    const price = Number(direction.price);
    const durationMonths = direction.durationMonths;
    const monthlyAmount = Math.round(price / durationMonths);

    const settings = await this.getOrCreateSettings();
    const fullDiscountPct =
      student.fullPaymentDiscountPercent != null
        ? Number(student.fullPaymentDiscountPercent)
        : Number(settings.fullPaymentDiscountPercent);
    const monthlyDiscountPct =
      student.monthlyDiscountPercent != null
        ? Number(student.monthlyDiscountPercent)
        : 0;

    const discountedFullPrice = Math.round(price * (1 - fullDiscountPct / 100));
    const discountedMonthlyAmount = Math.round(
      monthlyAmount * (1 - monthlyDiscountPct / 100),
    );

    const { payments, hasFullPayment, paidMonths } = await this.paidBreakdown(
      studentId,
      group.id,
    );

    const allMonths = courseMonths(group.startDate, durationMonths);
    const dueMonths = dueMonthsSoFar(group.startDate, durationMonths);
    const remainingUnpaidMonths = allMonths.filter((m) => !paidMonths.has(m));
    const unpaidDueMonths = dueMonths.filter((m) => !paidMonths.has(m));

    const fullyPaid = hasFullPayment || remainingUnpaidMonths.length === 0;
    const debtAmount = fullyPaid
      ? 0
      : unpaidDueMonths.length * discountedMonthlyAmount;

    return succesRes({
      studentId,
      groupId: group.id,
      hasCoursePricing: true,
      direction: { id: direction.id, name: direction.name, price, durationMonths },
      monthlyAmount,
      discountedMonthlyAmount,
      fullPaymentDiscountPercent: fullDiscountPct,
      monthlyDiscountPercent: monthlyDiscountPct,
      discountedFullPrice,
      totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
      fullyPaid,
      hasDebt: !fullyPaid && unpaidDueMonths.length > 0,
      debtAmount,
      unpaidDueMonths,
      remainingUnpaidMonths,
      canPayRemainder:
        !fullyPaid &&
        remainingUnpaidMonths.length > 0 &&
        remainingUnpaidMonths.length <= 3,
    });
  }

  async getMyBalance(userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return this.getBalance(student.id);
  }

  // Kursni bir martada, to'liq (chegirmali) narxda yopish
  async payFull(dto: PayFullDto, reqUser: any): Promise<ISucces> {
    const { student, group } = await this.resolveStudentGroup(
      dto.studentId,
      dto.groupId,
    );
    const direction = group.direction;
    const { payments, hasFullPayment } = await this.paidBreakdown(
      student.id,
      group.id,
    );
    if (hasFullPayment) {
      throw new BadRequestException("Kurs allaqachon to'liq to'langan");
    }

    const settings = await this.getOrCreateSettings();
    const discountPct =
      student.fullPaymentDiscountPercent != null
        ? Number(student.fullPaymentDiscountPercent)
        : Number(settings.fullPaymentDiscountPercent);
    const discountedFullPrice = Math.round(
      Number(direction.price) * (1 - discountPct / 100),
    );
    const alreadyPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = discountedFullPrice - alreadyPaid;
    if (remaining <= 0) {
      throw new BadRequestException("To'lanadigan qoldiq yo'q");
    }

    const payment = this.paymentRepo.create({
      studentId: student.id,
      groupId: group.id,
      amount: remaining,
      method: dto.method ?? PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      kind: PaymentKind.FULL,
      discountPercent: discountPct,
      paidAt: new Date(),
      createdById: reqUser?.id,
    });
    const saved = await this.paymentRepo.save(payment);
    return succesRes(saved, 201);
  }

  // Bitta oy uchun to'lov
  async payMonthly(dto: PayMonthlyDto, reqUser: any): Promise<ISucces> {
    const { student, group } = await this.resolveStudentGroup(
      dto.studentId,
      dto.groupId,
    );
    const direction = group.direction;
    const allMonths = courseMonths(group.startDate, direction.durationMonths);
    if (!allMonths.includes(dto.month)) {
      throw new BadRequestException(
        "Bu oy ushbu kurs davomiyligiga to'g'ri kelmaydi",
      );
    }

    const { hasFullPayment, paidMonths } = await this.paidBreakdown(
      student.id,
      group.id,
    );
    if (hasFullPayment) {
      throw new BadRequestException("Kurs allaqachon to'liq to'langan");
    }
    if (paidMonths.has(dto.month)) {
      throw new BadRequestException(
        "Bu oy uchun to'lov allaqachon qilingan",
      );
    }

    const monthlyAmount = Math.round(
      Number(direction.price) / direction.durationMonths,
    );
    const discountPct =
      student.monthlyDiscountPercent != null
        ? Number(student.monthlyDiscountPercent)
        : 0;
    const amount = Math.round(monthlyAmount * (1 - discountPct / 100));

    const payment = this.paymentRepo.create({
      studentId: student.id,
      groupId: group.id,
      amount,
      method: dto.method ?? PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      kind: PaymentKind.MONTHLY,
      discountPercent: discountPct,
      month: dto.month,
      paidAt: new Date(),
      createdById: reqUser?.id,
    });
    const saved = await this.paymentRepo.save(payment);
    return succesRes(saved, 201);
  }

  // Qolgan barcha oylarni bir martada to'lash — faqat 3 yoki undan kam oy qolganda
  async payRemainder(dto: PayRemainderDto, reqUser: any): Promise<ISucces> {
    const { student, group } = await this.resolveStudentGroup(
      dto.studentId,
      dto.groupId,
    );
    const direction = group.direction;
    const { hasFullPayment, paidMonths } = await this.paidBreakdown(
      student.id,
      group.id,
    );
    if (hasFullPayment) {
      throw new BadRequestException("Kurs allaqachon to'liq to'langan");
    }

    const allMonths = courseMonths(group.startDate, direction.durationMonths);
    const remaining = allMonths.filter((m) => !paidMonths.has(m));
    if (remaining.length === 0) {
      throw new BadRequestException("To'lanadigan qoldiq oy yo'q");
    }
    if (remaining.length > 3) {
      throw new BadRequestException(
        "Faqat 3 yoki undan kam oy qolganda bir martada to'lash mumkin",
      );
    }

    const monthlyAmount = Math.round(
      Number(direction.price) / direction.durationMonths,
    );
    const discountPct =
      student.monthlyDiscountPercent != null
        ? Number(student.monthlyDiscountPercent)
        : 0;
    const perMonth = Math.round(monthlyAmount * (1 - discountPct / 100));
    const amount = perMonth * remaining.length;

    const payment = this.paymentRepo.create({
      studentId: student.id,
      groupId: group.id,
      amount,
      method: dto.method ?? PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      kind: PaymentKind.REMAINDER,
      discountPercent: discountPct,
      month: remaining[remaining.length - 1],
      monthsCovered: remaining,
      paidAt: new Date(),
      createdById: reqUser?.id,
    });
    const saved = await this.paymentRepo.save(payment);
    return succesRes(saved, 201);
  }

  private paginate(
    data: Payment[],
    count: number,
    page: number,
    limit: number,
  ): IResponsePagination {
    const from = count === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, count);
    return {
      statusCode: 200,
      message: 'succes',
      data,
      totalElements: count,
      totalPages: Math.ceil(count / limit) || 0,
      pageSize: limit,
      currentPage: page,
      from,
      to,
    };
  }
}
