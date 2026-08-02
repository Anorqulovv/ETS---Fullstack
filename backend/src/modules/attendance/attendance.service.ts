import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Attendance } from "src/databases/entities/attendance.entity";
import { Student } from "src/databases/entities/student.entity";
import { Group } from "src/databases/entities/group.entity";
import { TelegramService } from "../telegram/telegram.service";
import { GamificationService } from "../gamification/gamification.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { succesRes } from "src/infrastructure/utils/succes-res";
import { UserRole } from "src/common/enums/role.enum";

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    private readonly telegramService: TelegramService,
    private readonly gamificationService: GamificationService,
  ) {}

  // ==================== TURNSTILE (karta) ====================

  // Davomat faqat bugungi dars kunida va dars boshlanishidan keyin qilinadi.
  // Vaqt Asia/Tashkent bo'yicha hisoblanadi.
  private assertManualAttendanceWindow(group: Group) {
    const lessonTime = group.lessonTime?.trim();
    const lessonDays = group.lessonDays ?? [];

    if (!lessonTime || !lessonDays.length) {
      throw new BadRequestException(
        "Bu guruh uchun dars kunlari yoki dars vaqti belgilanmagan.",
      );
    }

    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(lessonTime);

    if (!timeMatch) {
      throw new BadRequestException(
        "Guruh dars vaqti noto'g'ri. Masalan: 14:00",
      );
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tashkent",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(new Date());

    const getPart = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";

    const aliases: Record<string, string> = {
      monday: "monday", dushanba: "monday", du: "monday",
      tuesday: "tuesday", seshanba: "tuesday", se: "tuesday",
      wednesday: "wednesday", chorshanba: "wednesday", ch: "wednesday",
      thursday: "thursday", payshanba: "thursday", pa: "thursday",
      friday: "friday", juma: "friday", ju: "friday",
      saturday: "saturday", shanba: "saturday", sh: "saturday",
      sunday: "sunday", yakshanba: "sunday", ya: "sunday",
    };

    const normalizeDay = (value: string) =>
      aliases[String(value ?? "").trim().toLowerCase()] ??
      String(value ?? "").trim().toLowerCase();

    const today = normalizeDay(getPart("weekday"));

    const isLessonDay = lessonDays.some(
      (day) => normalizeDay(day) === today,
    );

    if (!isLessonDay) {
      throw new BadRequestException(
        "Bugun bu guruhning dars kuni emas. Davomat faqat dars kunida qilinadi.",
      );
    }

    const currentMinutes =
      Number(getPart("hour")) * 60 + Number(getPart("minute"));

    const lessonMinutes =
      Number(timeMatch[1]) * 60 + Number(timeMatch[2]);

    if (currentMinutes < lessonMinutes) {
      throw new BadRequestException(
        `Davomat faqat bugun soat ${lessonTime} dan keyin qilinadi.`,
      );
    }
  }

  async handleTurnstile(cardId: string) {
    const student = await this.studentRepo.findOne({
      where: { cardId },
      relations: ['user', 'parent', 'parent.user'],
    });
    if (!student) throw new NotFoundException('Karta egasi topilmadi');

    // Bugun allaqachon turnstile yozuvi bormi?
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.attRepo
      .createQueryBuilder('att')
      .where('att.studentId = :studentId', { studentId: student.id })
      .andWhere("att.type = 'TURNSTILE'")
      .andWhere('att.timestamp >= :today', { today })
      .getOne();

    if (existing) {
      return succesRes({
        message: 'Bugun allaqachon davomat yozilgan',
        student: student.user.fullName,
        alreadyRecorded: true,
      });
    }

    const attendance = this.attRepo.create({
      studentId: student.id,
      isPresent: true,
      type: 'TURNSTILE',
      timestamp: new Date(),
    });
    await this.attRepo.save(attendance);
    void this.gamificationService.awardForAttendance(student.id, attendance.id, true);

    const parentTelegramId = student.parent?.user?.telegramId;
    if (parentTelegramId) {
      const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      const message =
        `🔔 <b>Davomat xabarnomasi</b>\n\n` +
        `Farzandingiz <b>${student.user.fullName}</b> markazga keldi.\n` +
        `🕒 Vaqt: <b>${time}</b>`;
      await this.telegramService.sendNotification(parentTelegramId, message);
    }

    return succesRes({ message: 'Davomat saqlandi', student: student.user.fullName });
  }

  // ==================== QO'LDA DAVOMAT (ustoz) ====================
  async createByTeacher(dto: CreateAttendanceDto, reqUser: any) {
    const student = await this.studentRepo.findOne({
      where: { id: dto.studentId },
      relations: ['user', 'parent', 'parent.user', 'group'],
    });
    if (!student) throw new NotFoundException(`O'quvchi ID ${dto.studentId} topilmadi`);

    // Ustoz faqat o'z guruhidagi o'quvchilar uchun davomat qila oladi
    if (reqUser.role === UserRole.TEACHER) {
      const group = await this.groupRepo.findOne({
        where: { id: student.groupId, teacherId: reqUser.id },
      });
      if (!group) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz o'quvchilari uchun davomat qila olasiz");
      }
    }
      if (!student.group) {
        throw new BadRequestException("O'quvchi guruhga biriktirilmagan");
      }

      this.assertManualAttendanceWindow(student.group);


    const attendance = this.attRepo.create({
      studentId: dto.studentId,
      isPresent: dto.isPresent ?? true,
      type: dto.type ?? 'MANUAL',
      timestamp: new Date(),
    });
    await this.attRepo.save(attendance);
    void this.gamificationService.awardForAttendance(dto.studentId, attendance.id, dto.isPresent ?? true);

    // Ota-onaga TG xabar
    await this._notifyParent(student, dto.isPresent ?? true);

    return succesRes({ message: 'Davomat saqlandi', attendance });
  }

  // ==================== GURUH BO'YICHA TOPLU YO'QLAMA ====================
  async markGroupAttendance(
    groupId: number,
    attendances: { studentId: number; isPresent: boolean }[],
    reqUser: any,
  ) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['students', 'students.user', 'students.parent', 'students.parent.user'],
    });
    if (!group) throw new NotFoundException(`Guruh ID ${groupId} topilmadi`);

    // Ustoz faqat o'z guruhini boshqaradi
    if (reqUser.role === UserRole.TEACHER && group.teacherId !== reqUser.id) {
      throw new ForbiddenException("Siz faqat o'z guruhingiz yo'qlamasini qila olasiz");
    }
      this.assertManualAttendanceWindow(group);


    const results: any[] = [];
    for (const item of attendances) {
      const student = group.students?.find((s) => s.id === item.studentId);
      if (!student) continue;

      const att = this.attRepo.create({
        studentId: item.studentId,
        isPresent: item.isPresent,
        type: 'MANUAL',
        timestamp: new Date(),
      });
      await this.attRepo.save(att);
      void this.gamificationService.awardForAttendance(item.studentId, att.id, item.isPresent);
      results.push(att);

      // Ota-onaga xabar
      await this._notifyParent(student, item.isPresent);
    }

    return succesRes({
      message: `${results.length} ta o'quvchi yo'qlamasi saqlandi`,
      group: group.name,
      attendances: results,
    });
  }

  // ==================== GURUH DAVOMATINI KO'RISH ====================
  async getGroupAttendance(groupId: number, reqUser: any) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Guruh topilmadi`);

    if (reqUser.role === UserRole.TEACHER && group.teacherId !== reqUser.id) {
      throw new ForbiddenException("Siz faqat o'z guruhingiz davomatini ko'ra olasiz");
    }

    const students = await this.studentRepo.find({
      where: { groupId },
      relations: ['user'],
    });

    const result = await Promise.all(
      students.map(async (s) => {
        const records = await this.attRepo.find({
          where: { studentId: s.id },
          order: { timestamp: 'DESC' },
          take: 30,
        });
        return {
          studentId: s.id,
          fullName: s.user?.fullName,
          attendance: records,
        };
      }),
    );

    return succesRes(result);
  }

  // ==================== BARCHA DAVOMATLAR ====================
  async findAll(reqUser?: any) {
    if (reqUser?.role === UserRole.TEACHER) {
      const groups = await this.groupRepo.find({
        where: { teacherId: reqUser.id },
        select: ['id'],
      });

      const groupIds = groups.map((g) => g.id);

      if (!groupIds.length) return succesRes([]);

      const students = await this.studentRepo.find({
        where: groupIds.map((groupId) => ({ groupId })),
        select: ['id'],
      });

      const studentIds = students.map((s) => s.id);

      if (!studentIds.length) return succesRes([]);

      const data = await this.attRepo.find({
        where: studentIds.map((studentId) => ({ studentId })),
        relations: ['student', 'student.user', 'student.group'],
        order: { timestamp: 'DESC' },
      });

      return succesRes(data);
    }

    if (reqUser?.role === UserRole.SUPPORT) {
      const groups = await this.groupRepo.find({
        where: { supportId: reqUser.id },
        select: ['id'],
      });

      const groupIds = groups.map((g) => g.id);

      if (!groupIds.length) return succesRes([]);

      const students = await this.studentRepo.find({
        where: groupIds.map((groupId) => ({ groupId })),
        select: ['id'],
      });

      const studentIds = students.map((s) => s.id);

      if (!studentIds.length) return succesRes([]);

      const data = await this.attRepo.find({
        where: studentIds.map((studentId) => ({ studentId })),
        relations: ['student', 'student.user', 'student.group'],
        order: { timestamp: 'DESC' },
      });

      return succesRes(data);
    }

    const data = await this.attRepo.find({
      relations: ['student', 'student.user', 'student.group'],
      order: { timestamp: 'DESC' },
    });

    return succesRes(data);
  }

  // ==================== O'QUVCHI O'Z DAVOMATI ====================
  async findByStudentUserId(userId: number) {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const data = await this.attRepo.find({
      where: { studentId: student.id },
      order: { timestamp: 'DESC' },
    });
    return succesRes(data);
  }

  // ==================== ID BO'YICHA ====================
  async findOne(id: number) {
    const att = await this.attRepo.findOne({
      where: { id },
      relations: ['student', 'student.user'],
    });
    if (!att) throw new NotFoundException(`Davomat ID ${id} topilmadi`);
    return succesRes(att);
  }

  // ==================== PRIVATE: OTA-ONAGA XABAR ====================
  private async _notifyParent(student: Student, isPresent: boolean) {
    try {
      const parentTelegramId = (student as any).parent?.user?.telegramId;
      if (!parentTelegramId) return;

      const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      const name = (student as any).user?.fullName ?? 'O\'quvchi';

      const message = isPresent
        ? `✅ <b>Davomat xabarnomasi</b>\n\nFarzandingiz <b>${name}</b> bugun darsga <b>keldi</b>.\n🕒 Vaqt: <b>${time}</b>`
        : `⚠️ <b>Davomat xabarnomasi</b>\n\nFarzandingiz <b>${name}</b> bugun darsga <b>kelmadi</b>.\n🕒 Vaqt: <b>${time}</b>`;

      await this.telegramService.sendNotification(parentTelegramId, message);
    } catch (e) {
      console.error('_notifyParent error:', e);
    }
  }
}
