import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from 'src/databases/entities/student.entity';
import { PointsLog, PointsSource } from 'src/databases/entities/points-log.entity';
import { ShopItem } from 'src/databases/entities/shop-item.entity';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';

/** Fixed points for a present day — absence earns nothing (no log entry either). */
const ATTENDANCE_POINTS = 5;

/**
 * Test points scale down with each retake so first-try mastery is worth the most:
 * 1-attempt = 100% of the score, 2nd = 70%, 3rd = 50%, 4th and beyond = 0.
 * (Matches the requested "1-chi urinishda 100%, 2-chida 70%, 3-chida 50%, keyingilarida yo'q".)
 */
function testMultiplier(attempt: number): number {
  if (attempt <= 1) return 1;
  if (attempt === 2) return 0.7;
  if (attempt === 3) return 0.5;
  return 0;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(PointsLog)
    private readonly logRepo: Repository<PointsLog>,
    @InjectRepository(ShopItem)
    private readonly shopRepo: Repository<ShopItem>,
  ) {}

  /**
   * Called from AttendanceService right after an attendance row is created. Never throws —
   * a gamification hiccup must never block marking attendance, which is the actually important
   * operation. Errors are just logged.
   */
  async awardForAttendance(studentId: number, attendanceId: number, isPresent: boolean): Promise<void> {
    if (!isPresent) return;
    try {
      await this.addPoints(studentId, PointsSource.ATTENDANCE, ATTENDANCE_POINTS, attendanceId, 'Darsga qatnashgani uchun');
    } catch (e) {
      this.logger.error(`awardForAttendance failed for student ${studentId}: ${e}`);
    }
  }

  /**
   * Called from TestsService right after a test is scored. Never throws — same reasoning as
   * above, submitting/grading a test must not fail because of the points side-effect.
   */
  async awardForTest(studentId: number, testResultId: number, score: number, attempt: number): Promise<void> {
    try {
      const multiplier = testMultiplier(attempt);
      const points = Math.round(score * multiplier);
      const note =
        multiplier === 1
          ? "1-urinish — to'liq ball"
          : multiplier > 0
            ? `${attempt}-urinish — ${Math.round(multiplier * 100)}%`
            : `${attempt}-urinish — ball berilmaydi`;
      await this.addPoints(studentId, PointsSource.TEST, points, testResultId, note);
    } catch (e) {
      this.logger.error(`awardForTest failed for student ${studentId}: ${e}`);
    }
  }

  /**
   * Called from HomeworkService right after a submission is graded. Never throws — same
   * reasoning as awardForTest/awardForAttendance.
   */
  async awardForHomework(studentId: number, submissionId: number, score: number): Promise<void> {
    try {
      const points = Math.round(score);
      await this.addPoints(studentId, PointsSource.HOMEWORK, points, submissionId, 'Uyga vazifa baholandi');
    } catch (e) {
      this.logger.error(`awardForHomework failed for student ${studentId}: ${e}`);
    }
  }

  private async addPoints(
    studentId: number,
    source: PointsSource,
    amount: number,
    refId: number | null,
    note: string,
  ): Promise<void> {
    await this.logRepo.save(this.logRepo.create({ studentId, source, amount, refId: refId ?? undefined, note }));
    if (amount !== 0) {
      await this.studentRepo.increment({ id: studentId }, 'points', amount);
    }
  }

  async getMyPoints(studentId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    const logs = await this.logRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    return succesRes({ points: student?.points ?? 0, logs });
  }

  /** The JWT only carries the User id — resolve it to the matching Student row first. */
  async getMyPointsByUserId(userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) return succesRes({ points: 0, logs: [] });
    return this.getMyPoints(student.id);
  }

  async getLeaderboard(params: { groupId?: number; limit?: number }): Promise<ISucces> {
    const qb = this.studentRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .orderBy('student.points', 'DESC')
      .limit(params.limit ?? 20);
    if (params.groupId) {
      qb.andWhere('student.groupId = :groupId', { groupId: params.groupId });
    }
    const students = await qb.getMany();
    return succesRes(
      students.map((s, i) => ({
        rank: i + 1,
        studentId: s.id,
        fullName: s.user?.fullName ?? '—',
        points: s.points,
      })),
    );
  }

  // ==================== QO'LDA BALL QO'SHISH (SUPERADMIN/ADMIN/TEACHER) ====================

  async award(studentId: number, amount: number, note?: string): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`O'quvchi ID ${studentId} topilmadi`);
    if (!amount) throw new BadRequestException("Ball miqdori 0 bo'lmasligi kerak");

    await this.addPoints(studentId, PointsSource.MANUAL, amount, null, note ?? "Admin tomonidan qo'shildi");
    const updated = await this.studentRepo.findOne({ where: { id: studentId } });
    return succesRes({ studentId, points: updated?.points ?? 0 });
  }

  // ==================== DO'KON (SHOP) ====================

  async listShopItems(includeInactive = false): Promise<ISucces> {
    const items = await this.shopRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { cost: 'ASC' },
    });
    return succesRes(items);
  }

  async createShopItem(dto: {
    name: string;
    description?: string;
    cost: number;
    imageUrl?: string;
    stock?: number;
    isActive?: boolean;
  }): Promise<ISucces> {
    const item = this.shopRepo.create(dto);
    const saved = await this.shopRepo.save(item);
    return succesRes(saved, 201);
  }

  async updateShopItem(
    id: number,
    dto: Partial<{
      name: string;
      description?: string;
      cost: number;
      imageUrl?: string;
      stock?: number;
      isActive?: boolean;
    }>,
  ): Promise<ISucces> {
    const item = await this.shopRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Mahsulot ID ${id} topilmadi`);
    await this.shopRepo.update(id, dto);
    const updated = await this.shopRepo.findOne({ where: { id } });
    return succesRes(updated);
  }

  async removeShopItem(id: number): Promise<ISucces> {
    const item = await this.shopRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Mahsulot ID ${id} topilmadi`);
    await this.shopRepo.delete(id);
    return succesRes({ message: "Mahsulot o'chirildi" });
  }

  // O'quvchi o'zi — reqUser.id bu userId, avval studentId topiladi
  async purchaseByUserId(userId: number, itemId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return this.purchase(student.id, itemId);
  }

  async purchase(studentId: number, itemId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`O'quvchi ID ${studentId} topilmadi`);

    const item = await this.shopRepo.findOne({ where: { id: itemId } });
    if (!item || !item.isActive) {
      throw new NotFoundException("Mahsulot topilmadi yoki faol emas");
    }
    if (item.stock != null && item.stock <= 0) {
      throw new BadRequestException("Mahsulot tugagan");
    }
    if (student.points < item.cost) {
      throw new BadRequestException("Ballaringiz yetarli emas");
    }

    if (item.stock != null) {
      await this.shopRepo.decrement({ id: item.id }, 'stock', 1);
    }
    await this.addPoints(studentId, PointsSource.SHOP, -item.cost, item.id, `Xarid: ${item.name}`);

    const updated = await this.studentRepo.findOne({ where: { id: studentId } });
    return succesRes({ studentId, points: updated?.points ?? 0, item: item.name });
  }
}
