import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportAvailability } from 'src/databases/entities/support-availability.entity';
import { SupportBooking } from 'src/databases/entities/support-booking.entity';
import { Student } from 'src/databases/entities/student.entity';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { TelegramService } from '../telegram/telegram.service';

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toTimeStr(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class SupportAvailabilityService {
  constructor(
    @InjectRepository(SupportAvailability) private readonly availRepo: Repository<SupportAvailability>,
    @InjectRepository(SupportBooking) private readonly bookingRepo: Repository<SupportBooking>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly telegramService: TelegramService,
  ) {}

  // ==================== SUPPORT: BO'SH VAQT BELGILASH ====================
  async createAvailability(dto: CreateAvailabilityDto, reqUser: any): Promise<ISucces> {
    if (toMinutes(dto.endTime) <= toMinutes(dto.startTime)) {
      throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }
    const availability = this.availRepo.create({
      supportId: reqUser.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    const saved = await this.availRepo.save(availability);
    return succesRes(saved, 201);
  }

  async getMyAvailability(supportId: number): Promise<ISucces> {
    const list = await this.availRepo.find({
      where: { supportId },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    return succesRes(list);
  }

  async removeAvailability(id: number, reqUser: any): Promise<ISucces> {
    const availability = await this.availRepo.findOne({ where: { id } });
    if (!availability) throw new NotFoundException("Vaqt oynasi topilmadi");
    if (reqUser.role === UserRole.SUPPORT && availability.supportId !== reqUser.id) {
      throw new ForbiddenException("Siz faqat o'zingizning vaqt oynangizni o'chira olasiz");
    }
    await this.availRepo.delete(id);
    return succesRes({ message: "Vaqt oynasi o'chirildi" });
  }

  // ==================== O'QUVCHI: BO'SH SLOTLARNI KO'RISH ====================
  async getFreeSlots(supportId: number, date: string): Promise<ISucces> {
    const windows = await this.availRepo.find({ where: { supportId, date } });
    const bookings = await this.bookingRepo.find({ where: { supportId, date } });

    const slots: { startTime: string; endTime: string }[] = [];
    const STEP = 30;

    for (const w of windows) {
      const start = toMinutes(w.startTime);
      const end = toMinutes(w.endTime);
      for (let t = start; t + STEP <= end; t += STEP) {
        const slotStart = t;
        const slotEnd = t + STEP;
        const overlaps = bookings.some(
          (b) => toMinutes(b.startTime) < slotEnd && slotStart < toMinutes(b.endTime),
        );
        if (!overlaps) {
          slots.push({ startTime: toTimeStr(slotStart), endTime: toTimeStr(slotEnd) });
        }
      }
    }
    return succesRes(slots);
  }

  async getAvailableSupportsForDate(date: string): Promise<ISucces> {
    const windows = await this.availRepo.find({
      where: { date },
      relations: ['support'],
      order: { startTime: 'ASC' },
    });
    const bySupportId = new Map<number, { supportId: number; fullName: string; windows: { startTime: string; endTime: string }[] }>();
    for (const w of windows) {
      const entry = bySupportId.get(w.supportId) ?? {
        supportId: w.supportId,
        fullName: w.support?.fullName ?? '—',
        windows: [],
      };
      entry.windows.push({ startTime: w.startTime, endTime: w.endTime });
      bySupportId.set(w.supportId, entry);
    }
    return succesRes(Array.from(bySupportId.values()));
  }

  // ==================== BAND QILISH ====================
  async createBooking(dto: CreateBookingDto, reqUser: any): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId: reqUser.id } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const support = await this.userRepo.findOne({ where: { id: dto.supportId, role: UserRole.SUPPORT } });
    if (!support) throw new NotFoundException("Support topilmadi");

    const startMin = toMinutes(dto.startTime);
    const endMin = startMin + dto.durationMinutes;
    const endTime = toTimeStr(endMin);

    const windows = await this.availRepo.find({ where: { supportId: dto.supportId, date: dto.date } });
    const fitsWindow = windows.some(
      (w) => toMinutes(w.startTime) <= startMin && endMin <= toMinutes(w.endTime),
    );
    if (!fitsWindow) {
      throw new BadRequestException("Bu vaqt support ochgan bo'sh vaqt oralig'iga to'g'ri kelmaydi");
    }

    const existingBookings = await this.bookingRepo.find({ where: { supportId: dto.supportId, date: dto.date } });
    const overlaps = existingBookings.some(
      (b) => toMinutes(b.startTime) < endMin && startMin < toMinutes(b.endTime),
    );
    if (overlaps) {
      throw new BadRequestException("Bu vaqt allaqachon band qilingan, boshqa vaqt tanlang");
    }

    const booking = this.bookingRepo.create({
      supportId: dto.supportId,
      studentId: student.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime,
      durationMinutes: dto.durationMinutes,
    });
    const saved = await this.bookingRepo.save(booking);

    if (support.telegramId) {
      const studentUser = await this.userRepo.findOne({ where: { id: reqUser.id } });
      await this.telegramService.sendNotification(
        support.telegramId,
        `\u{1F4C5} <b>Yangi bandlik</b>\n\n` +
          `\u{1F464} O'quvchi: <b>${studentUser?.fullName ?? '—'}</b>\n` +
          `\u{1F4C6} Sana: <b>${dto.date}</b>\n` +
          `\u{1F550} Vaqt: <b>${dto.startTime} - ${endTime}</b>`,
      );
    }

    return succesRes(saved, 201);
  }

  async getMyBookingsAsStudent(userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) return succesRes([]);
    const bookings = await this.bookingRepo.find({
      where: { studentId: student.id },
      relations: ['support'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
    return succesRes(bookings);
  }

  async getMyBookingsAsSupport(supportId: number): Promise<ISucces> {
    const bookings = await this.bookingRepo.find({
      where: { supportId },
      relations: ['student', 'student.user'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
    return succesRes(bookings);
  }

  async cancelBooking(id: number, reqUser: any): Promise<ISucces> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Bandlik topilmadi');

    if (reqUser.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({ where: { userId: reqUser.id } });
      if (!student || student.id !== booking.studentId) {
        throw new ForbiddenException("Siz faqat o'zingizning bandligingizni bekor qila olasiz");
      }
    } else if (reqUser.role === UserRole.SUPPORT && booking.supportId !== reqUser.id) {
      throw new ForbiddenException("Siz faqat o'zingizning bandliklaringizni bekor qila olasiz");
    }

    await this.bookingRepo.delete(id);
    return succesRes({ message: 'Bandlik bekor qilindi' });
  }
}
