import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { Group } from 'src/databases/entities/group.entity';
import { Direction } from 'src/databases/entities/direction.entity';
import { CancelledLesson } from 'src/databases/entities/cancelled-lesson.entity';
import { Student } from 'src/databases/entities/student.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { GroupStatus } from 'src/common/enums/groupStatus.enum';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { BaseService } from 'src/infrastructure/utils/BaseService';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CancelLessonDto } from './dto/cancel-lesson.dto';

const WEEKDAY_INDEX: Record<string, number> = {
  Yakshanba: 0,
  Dushanba: 1,
  Seshanba: 2,
  Chorshanba: 3,
  Payshanba: 4,
  Juma: 5,
  Shanba: 6,
};

@Injectable()
export class GroupsService extends BaseService<CreateGroupDto, UpdateGroupDto, Group> {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Direction) private readonly directionRepo: Repository<Direction>,
    @InjectRepository(CancelledLesson)
    private readonly cancelledLessonRepo: Repository<CancelledLesson>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {
    super(groupRepo);
  }

  private normalizeDate(date?: string | null): Date | null {
    if (!date) return null;
    const d = new Date(`${date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** startDate + durationMonths, minus a day (a 5-month course starting Jan 1 ends May 31). */
  private computeEndDate(startDate: string, durationMonths: number): string {
    const start = this.normalizeDate(startDate)!;
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    end.setDate(end.getDate() - 1);
    return this.toDateStr(end);
  }

  /** The next date after `afterDate` that falls on one of the group's lesson weekdays. */
  private nextLessonDateAfter(afterDate: Date, lessonDays: string[]): Date {
    const allowed = new Set(
      lessonDays.map((d) => WEEKDAY_INDEX[d]).filter((v) => v !== undefined),
    );
    const d = new Date(afterDate);
    for (let i = 0; i < 14; i++) {
      d.setDate(d.getDate() + 1);
      if (allowed.has(d.getDay())) return d;
    }
    return d;
  }

  /**
   * Guruh yo'nalishining davomiyligi belgilangan bo'lsa, endDate mijoz nima yuborishidan
   * qat'i nazar shu davomiylikka mos hisoblab qo'yiladi — masalan Fullstack 5 oy bo'lsa,
   * guruhni 4 yoki 6 oyga cho'zib bo'lmaydi (backend har doim to'g'ri sanani hisoblaydi).
   */
  private async resolveEndDate(
    directionId: number | undefined,
    startDate: string | undefined,
    fallbackEndDate: string | undefined,
  ): Promise<string | undefined> {
    if (!directionId || !startDate) return fallbackEndDate;
    const direction = await this.directionRepo.findOne({ where: { id: directionId } });
    if (!direction?.durationMonths) return fallbackEndDate;
    return this.computeEndDate(startDate, direction.durationMonths);
  }

  private todayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private timeToMinutes(time?: string | null): number | null {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  private hasDateOverlap(
    aStart?: string | null,
    aEnd?: string | null,
    bStart?: string | null,
    bEnd?: string | null,
  ): boolean {
    const startA = this.normalizeDate(aStart) ?? new Date('1970-01-01T00:00:00');
    const endA = this.normalizeDate(aEnd) ?? new Date('2999-12-31T00:00:00');
    const startB = this.normalizeDate(bStart) ?? new Date('1970-01-01T00:00:00');
    const endB = this.normalizeDate(bEnd) ?? new Date('2999-12-31T00:00:00');

    return startA <= endB && startB <= endA;
  }

  private hasTimeOverlap(
    timeA?: string | null,
    durationA?: number | null,
    timeB?: string | null,
    durationB?: number | null,
  ): boolean {
    const startA = this.timeToMinutes(timeA);
    const startB = this.timeToMinutes(timeB);

    if (startA === null || startB === null) return false;

    const endA = startA + Number(durationA || 90);
    const endB = startB + Number(durationB || 90);

    return startA < endB && startB < endA;
  }

  private validateGroupDates(startDate?: string | null, endDate?: string | null) {
    const today = this.todayStart();
    const start = this.normalizeDate(startDate);
    const end = this.normalizeDate(endDate);

    if (start && start < today) {
      throw new BadRequestException("Guruh boshlanish sanasi bugungi kundan oldin bo'lishi mumkin emas");
    }

    if (end && end < today) {
      throw new BadRequestException("Guruh tugash sanasi bugungi kundan oldin bo'lishi mumkin emas");
    }

    if (start && end && end < start) {
      throw new BadRequestException("Guruh tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas");
    }
  }

  private validateLessonDays(lessonDays?: string[] | null) {
    if (!lessonDays?.length) return;

    if (lessonDays.includes('Yakshanba')) {
      throw new BadRequestException("Yakshanba kuni dars qo'yib bo'lmaydi");
    }
  }

  private async checkUserAvailability(params: {
    userId?: number | null;
    roleName: "O'qituvchi" | "Support";
    field: 'teacherId' | 'supportId';
    lessonDays?: string[] | null;
    lessonTime?: string | null;
    lessonDuration?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    excludeGroupId?: number;
  }): Promise<void> {
    const {
      userId,
      roleName,
      field,
      lessonDays,
      lessonTime,
      lessonDuration,
      startDate,
      endDate,
      excludeGroupId,
    } = params;

    if (!userId || !lessonDays?.length || !lessonTime) return;

    const existingGroups = await this.groupRepo.find({
      where: {
        [field]: userId,
        status: GroupStatus.ACTIVE,
        ...(excludeGroupId ? { id: Not(excludeGroupId) } : {}),
      } as any,
    });

    for (const group of existingGroups) {
      if (!group.lessonTime || !group.lessonDays?.length) continue;

      const overlappingDays = (group.lessonDays as string[]).filter((day) =>
        lessonDays.includes(day),
      );

      if (!overlappingDays.length) continue;

      const dateOverlap = this.hasDateOverlap(
        startDate,
        endDate,
        group.startDate,
        group.endDate,
      );

      if (!dateOverlap) continue;

      const timeOverlap = this.hasTimeOverlap(
        lessonTime,
        lessonDuration,
        group.lessonTime,
        group.lessonDuration,
      );

      if (timeOverlap) {
        throw new BadRequestException(
          `${roleName} band: "${group.name}" guruhida ${overlappingDays.join(', ')} kuni ${group.lessonTime} da darsi bor. Boshqa vaqt yoki boshqa ${roleName.toLowerCase()} tanlang.`,
        );
      }
    }
  }

  async create(dto: CreateGroupDto): Promise<ISucces> {
    dto.endDate = await this.resolveEndDate(dto.directionId, dto.startDate, dto.endDate);
    this.validateGroupDates(dto.startDate, dto.endDate);
    this.validateLessonDays(dto.lessonDays);

    await this.checkUserAvailability({
      userId: dto.teacherId,
      roleName: "O'qituvchi",
      field: 'teacherId',
      lessonDays: dto.lessonDays,
      lessonTime: dto.lessonTime,
      lessonDuration: dto.lessonDuration,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    await this.checkUserAvailability({
      userId: dto.supportId,
      roleName: "Support",
      field: 'supportId',
      lessonDays: dto.lessonDays,
      lessonTime: dto.lessonTime,
      lessonDuration: dto.lessonDuration,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    return super.create(dto);
  }

  async update(id: number, dto: UpdateGroupDto): Promise<ISucces> {
    const existing = await this.groupRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Guruh topilmadi');

    const directionId = dto.directionId ?? existing.directionId;
    const teacherId = dto.teacherId ?? existing.teacherId;
    const supportId = dto.supportId ?? existing.supportId;
    const lessonDays = (dto.lessonDays ?? existing.lessonDays) as any;
    const lessonTime = dto.lessonTime ?? existing.lessonTime;
    const lessonDuration = dto.lessonDuration ?? existing.lessonDuration;
    const startDate = dto.startDate ?? existing.startDate;

    // directionId yoki startDate o'zgargan bo'lsa, endDate'ni yo'nalish davomiyligiga qarab
    // qayta hisoblaymiz — mijoz yubormoqchi bo'lgan endDate e'tiborga olinmaydi.
    if (dto.directionId !== undefined || dto.startDate !== undefined) {
      dto.endDate = await this.resolveEndDate(directionId, startDate, dto.endDate ?? existing.endDate);
    }
    const endDate = dto.endDate ?? existing.endDate;

    // Update paytida eski startDate oldin bo'lishi mumkin.
    // Agar user startDate/endDate ni o'zgartirmasa, faqat date tartibini tekshiramiz.
    const startDateChanged =
      dto.startDate !== undefined && dto.startDate !== existing.startDate;

    const endDateChanged =
      dto.endDate !== undefined && dto.endDate !== existing.endDate;

    if (startDateChanged || endDateChanged) {
      this.validateGroupDates(startDate, endDate);
    } else {
      const start = this.normalizeDate(startDate);
      const end = this.normalizeDate(endDate);

      if (start && end && end < start) {
        throw new BadRequestException("Guruh tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas");
      }
    }

    this.validateLessonDays(lessonDays);

    await this.checkUserAvailability({
      userId: teacherId,
      roleName: "O'qituvchi",
      field: 'teacherId',
      lessonDays,
      lessonTime,
      lessonDuration,
      startDate,
      endDate,
      excludeGroupId: id,
    });

    await this.checkUserAvailability({
      userId: supportId,
      roleName: "Support",
      field: 'supportId',
      lessonDays,
      lessonTime,
      lessonDuration,
      startDate,
      endDate,
      excludeGroupId: id,
    });

    return super.update(id, dto);
  }

  async findAll(currentUser: any, query?: any): Promise<ISucces> {
    const where: any = {};

    if (query?.name) where.name = ILike(`%${query.name}%`);
    if (query?.teacherId) where.teacherId = Number(query.teacherId);
    if (query?.directionId) where.directionId = Number(query.directionId);
    if (query?.branchId) where.branchId = Number(query.branchId);

    let baseWhere: any;

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(currentUser.role)) {
      baseWhere = where;
    } else if (currentUser.role === UserRole.SUPPORT) {
      baseWhere = { ...where, directionId: currentUser.directionId };
    } else if (currentUser.role === UserRole.TEACHER) {
      baseWhere = { ...where, teacherId: currentUser.id };
    } else if (currentUser.role === UserRole.STUDENT) {
      // O'quvchi faqat o'zi biriktirilgan guruhni ko'rishi kerak — teacherId bilan hech qanday
      // aloqasi yo'q edi (avval barcha rollar uchun umumiy "teacherId = currentUser.id" filtri
      // ishlatilardi, bu esa tasodifiy id mos kelib qolganda boshqa birovning guruhini
      // o'quvchiga ko'rsatib qo'yishi mumkin edi).
      const student = await this.studentRepo.findOne({ where: { userId: currentUser.id } });
      if (!student?.groupId) return succesRes([]);
      baseWhere = { ...where, id: student.groupId };
    } else {
      // MANAGER, MARKETING, SALES, FINANCE — operatsion/moliyaviy nazorat uchun barcha
      // guruhlarni ko'radi (yozish huquqisiz), xuddi SUPERADMIN/ADMIN kabi.
      baseWhere = where;
    }

    const groups = await this.groupRepo.find({
      where: baseWhere,
      relations: ['teacher', 'direction', 'students'],
    });

    return succesRes(groups);
  }

  async findOneWithStudents(id: number): Promise<ISucces> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['teacher', 'direction', 'students', 'students.user', 'support'],
    });

    if (!group) throw new NotFoundException('Group topilmadi');
    return succesRes(group);
  }

  async updateStatus(id: number, status: GroupStatus): Promise<ISucces> {
    await this.groupRepo.update(id, { status });
    return succesRes({ message: 'Guruh holati yangilandi' });
  }

  /**
   * Bir kunlik darsni bekor qilish (masalan bayram kuni) va o'rniga kursning oxiriga bitta
   * qo'shimcha dars kuni qo'shish — guruh endDate'ini keyingi mos dars kunigacha suradi.
   */
  async cancelLesson(
    groupId: number,
    dto: CancelLessonDto,
    actorUserId?: number,
  ): Promise<ISucces> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (!group.lessonDays?.length) {
      throw new BadRequestException(
        "Bu guruhda dars kunlari belgilanmagan, dars bekor qilib bo'lmaydi",
      );
    }

    const already = await this.cancelledLessonRepo.findOne({
      where: { groupId, date: dto.date },
    });
    if (already) {
      throw new BadRequestException("Bu sana uchun dars allaqachon bekor qilingan");
    }

    const record = this.cancelledLessonRepo.create({
      groupId,
      date: dto.date,
      reason: dto.reason,
      createdById: actorUserId,
    });
    await this.cancelledLessonRepo.save(record);

    const currentEnd = this.normalizeDate(group.endDate) ?? this.normalizeDate(dto.date)!;
    const newEnd = this.nextLessonDateAfter(currentEnd, group.lessonDays);
    const newEndDate = this.toDateStr(newEnd);
    await this.groupRepo.update(groupId, { endDate: newEndDate });

    return succesRes({
      cancelledDate: dto.date,
      previousEndDate: group.endDate,
      newEndDate,
      message: "Dars bekor qilindi, kurs oxiriga bitta dars qo'shildi",
    });
  }

  async listCancelledLessons(groupId: number): Promise<ISucces> {
    const rows = await this.cancelledLessonRepo.find({
      where: { groupId },
      order: { date: 'DESC' },
    });
    return succesRes(rows);
  }

  async getGroupScore(id: number): Promise<ISucces> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: [
        'students',
        'students.results',
        'students.attendance',
        'students.user',
      ],
    });

    if (!group) throw new NotFoundException('Group topilmadi');

    const students = group.students ?? [];
    const total = students.length;

    let totalScore = 0;
    let testCount = 0;

    students.forEach((s: any) => {
      (s.results ?? []).forEach((r: any) => {
        totalScore += r.score ?? 0;
        testCount++;
      });
    });

    const avgScore = testCount > 0 ? Math.round(totalScore / testCount) : 0;

    let presentCount = 0;
    let attTotal = 0;

    students.forEach((s: any) => {
      (s.attendance ?? []).forEach((a: any) => {
        attTotal++;
        if (a.isPresent) presentCount++;
      });
    });

    const attendanceRate = attTotal > 0 ? Math.round((presentCount / attTotal) * 100) : 0;
    const overallScore = Math.round((avgScore + attendanceRate) / 2);

    const grade =
      overallScore >= 90 ? 'A' :
      overallScore >= 75 ? 'B' :
      overallScore >= 60 ? 'C' :
      overallScore >= 45 ? 'D' : 'F';

    return succesRes({
      groupId: id,
      groupName: group.name,
      totalStudents: total,
      avgTestScore: avgScore,
      attendanceRate,
      overallScore,
      grade,
    });
  }
}
