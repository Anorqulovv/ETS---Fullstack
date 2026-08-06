import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { Group } from 'src/databases/entities/group.entity';
import { CancelledLesson } from 'src/databases/entities/cancelled-lesson.entity';
import { SalarySettings } from 'src/databases/entities/salary-settings.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { SalaryMode } from 'src/common/enums/salaryMode.enum';
import { UpdateSalarySettingsDto } from './dto/update-salary-settings.dto';
import { SetUserSalaryDto } from './dto/set-user-salary.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';

const WEEKDAY_INDEX: Record<string, number> = {
  Yakshanba: 0,
  Dushanba: 1,
  Seshanba: 2,
  Chorshanba: 3,
  Payshanba: 4,
  Juma: 5,
  Shanba: 6,
};

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(CancelledLesson)
    private readonly cancelledLessonRepo: Repository<CancelledLesson>,
    @InjectRepository(SalarySettings)
    private readonly settingsRepo: Repository<SalarySettings>,
  ) {}

  private async getOrCreateSettings(): Promise<SalarySettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1, teacherPerLessonRate: 50000, supportPerLessonRate: 30000 });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async getSettings(): Promise<ISucces> {
    return succesRes(await this.getOrCreateSettings());
  }

  async updateSettings(dto: UpdateSalarySettingsDto): Promise<ISucces> {
    const settings = await this.getOrCreateSettings();
    settings.teacherPerLessonRate = dto.teacherPerLessonRate;
    settings.supportPerLessonRate = dto.supportPerLessonRate;
    return succesRes(await this.settingsRepo.save(settings));
  }

  // SUPERADMIN — bitta xodimning oylik rejimi/narxini belgilaydi
  async setUserSalary(userId: number, dto: SetUserSalaryDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Xodim ID ${userId} topilmadi`);
    if (dto.salaryMode !== undefined) user.salaryMode = dto.salaryMode;
    if (dto.perLessonRate !== undefined) user.perLessonRate = dto.perLessonRate;
    if (dto.salary !== undefined) user.salary = dto.salary;
    const saved = await this.userRepo.save(user);
    const { password: _pw, ...safe } = saved as any;
    return succesRes(safe);
  }

  /** Bitta guruhning berilgan oydagi (YYYY-MM) haqiqiy dars kunlari soni — bekor qilingan
   * kunlarni hisobga olmaydi, faqat guruhning faol sanalari (startDate/endDate) oralig'ida. */
  private async countLessonsInMonth(group: Group, month: string): Promise<number> {
    if (!group.lessonDays?.length) return 0;
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const mon = Number(monthStr);

    const allowedWeekdays = new Set(
      group.lessonDays.map((d) => WEEKDAY_INDEX[d]).filter((v) => v !== undefined),
    );
    if (!allowedWeekdays.size) return 0;

    const start = group.startDate ? new Date(`${group.startDate}T00:00:00`) : null;
    const end = group.endDate ? new Date(`${group.endDate}T00:00:00`) : null;

    const cancelled = await this.cancelledLessonRepo.find({ where: { groupId: group.id } });
    const cancelledDates = new Set(cancelled.map((c) => c.date));

    const total = daysInMonth(year, mon);
    let count = 0;
    for (let day = 1; day <= total; day++) {
      const d = new Date(year, mon - 1, day);
      if (!allowedWeekdays.has(d.getDay())) continue;
      if (start && d < start) continue;
      if (end && d > end) continue;
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (cancelledDates.has(dateStr)) continue;
      count++;
    }
    return count;
  }

  // Bitta xodimning berilgan oy uchun oyligi (dars kunlari x narx, yoki FIXED bo'lsa belgilangan oylik)
  async computeSalary(userId: number, month?: string): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Xodim ID ${userId} topilmadi`);

    const targetMonth = month ?? currentMonthKey();

    if (![UserRole.TEACHER, UserRole.SUPPORT].includes(user.role)) {
      return succesRes({
        userId,
        month: targetMonth,
        mode: SalaryMode.FIXED,
        fixedSalary: user.salary ?? 0,
        payableAmount: user.salary ?? 0,
        lessonsCount: 0,
        perLessonRate: 0,
      });
    }

    const groups =
      user.role === UserRole.TEACHER
        ? await this.groupRepo.find({ where: { teacherId: userId } })
        : await this.groupRepo.find({ where: { supportId: userId } });

    let lessonsCount = 0;
    for (const group of groups) {
      lessonsCount += await this.countLessonsInMonth(group, targetMonth);
    }

    const settings = await this.getOrCreateSettings();
    const defaultRate =
      user.role === UserRole.TEACHER ? settings.teacherPerLessonRate : settings.supportPerLessonRate;
    const rate = user.perLessonRate ?? defaultRate;
    const computedTotal = lessonsCount * rate;

    const mode = user.salaryMode ?? SalaryMode.FIXED;
    const payableAmount = mode === SalaryMode.PER_LESSON ? computedTotal : (user.salary ?? 0);

    return succesRes({
      userId,
      fullName: user.fullName,
      role: user.role,
      month: targetMonth,
      mode,
      lessonsCount,
      perLessonRate: rate,
      computedTotal,
      fixedSalary: user.salary ?? 0,
      payableAmount,
      groupsCount: groups.length,
    });
  }

  async computeMySalary(userId: number, month?: string): Promise<ISucces> {
    return this.computeSalary(userId, month);
  }

  // SUPERADMIN nazorat paneli — barcha o'qituvchi va supportlarning shu oygi oyligi
  async getOverview(month?: string): Promise<ISucces> {
    const targetMonth = month ?? currentMonthKey();
    const users = await this.userRepo.find({
      where: [{ role: UserRole.TEACHER }, { role: UserRole.SUPPORT }],
      order: { fullName: 'ASC' },
    });

    const rows = [];
    for (const user of users) {
      const result = await this.computeSalary(user.id, targetMonth);
      rows.push((result as any).data);
    }
    return succesRes(rows);
  }
}
