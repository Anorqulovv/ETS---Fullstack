import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeworkAssignment } from 'src/databases/entities/homework-assignment.entity';
import { HomeworkSubmission } from 'src/databases/entities/homework-submission.entity';
import { Student } from 'src/databases/entities/student.entity';
import { Group } from 'src/databases/entities/group.entity';
import { HomeworkSubmissionStatus } from 'src/common/enums/homework-status.enum';
import { UserRole } from 'src/common/enums/role.enum';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeHomeworkDto } from './dto/grade-homework.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { GamificationService } from '../gamification/gamification.service';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (dekodlangan hajm)
const FILE_RETENTION_DAYS = 15;

@Injectable()
export class HomeworkService implements OnModuleInit {
  constructor(
    @InjectRepository(HomeworkAssignment) private readonly assignmentRepo: Repository<HomeworkAssignment>,
    @InjectRepository(HomeworkSubmission) private readonly submissionRepo: Repository<HomeworkSubmission>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    private readonly gamificationService: GamificationService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.purgeExpiredFiles().catch((err) =>
        console.error('purgeExpiredFiles error:', err?.message ?? err),
      );
    }, 6 * 60 * 60 * 1000);
  }

  async create(dto: CreateHomeworkDto, currentUser: any): Promise<ISucces> {
    const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException(`Guruh ID ${dto.groupId} topilmadi`);

    if (currentUser.role === UserRole.TEACHER && group.teacherId !== currentUser.id) {
      throw new ForbiddenException("Siz faqat o'z guruhingizga uyga vazifa bera olasiz");
    }

    const assignment = this.assignmentRepo.create({
      title: dto.title,
      description: dto.description,
      groupId: dto.groupId,
      createdById: currentUser.id,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
    const saved = await this.assignmentRepo.save(assignment);
    return succesRes(saved, 201);
  }

  async findAll(currentUser: any, query?: any): Promise<ISucces> {
    let allowedGroupIds: number[] | null = null;

    if (currentUser.role === UserRole.TEACHER) {
      const groups = await this.groupRepo.find({ where: { teacherId: currentUser.id }, select: ['id'] });
      allowedGroupIds = groups.map((g) => g.id);
    } else if (currentUser.role === UserRole.SUPPORT) {
      const groups = await this.groupRepo.find({ where: { directionId: currentUser.directionId }, select: ['id'] });
      allowedGroupIds = groups.map((g) => g.id);
    } else if (currentUser.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({ where: { userId: currentUser.id } });
      allowedGroupIds = student?.groupId ? [student.groupId] : [];
    }

    if (allowedGroupIds) {
      if (query?.groupId) {
        const gid = Number(query.groupId);
        allowedGroupIds = allowedGroupIds.includes(gid) ? [gid] : [];
      }
      if (!allowedGroupIds.length) return succesRes([]);
      const assignments = await this.assignmentRepo.find({
        where: allowedGroupIds.map((groupId) => ({ groupId })),
        relations: ['group'],
        order: { createdAt: 'DESC' },
      });
      return succesRes(assignments);
    }

    const where: any = {};
    if (query?.groupId) where.groupId = Number(query.groupId);
    const assignments = await this.assignmentRepo.find({ where, relations: ['group'], order: { createdAt: 'DESC' } });
    return succesRes(assignments);
  }

  async findOne(id: number): Promise<ISucces> {
    const assignment = await this.assignmentRepo.findOne({ where: { id }, relations: ['group'] });
    if (!assignment) throw new NotFoundException(`Uyga vazifa ID ${id} topilmadi`);
    return succesRes(assignment);
  }

  async update(id: number, dto: UpdateHomeworkDto, currentUser: any): Promise<ISucces> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException(`Uyga vazifa ID ${id} topilmadi`);

    if (currentUser.role === UserRole.TEACHER && assignment.createdById !== currentUser.id) {
      throw new ForbiddenException("Siz faqat o'zingiz yaratgan uyga vazifani tahrirlay olasiz");
    }

    await this.assignmentRepo.update(id, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
    const updated = await this.assignmentRepo.findOne({ where: { id } });
    return succesRes(updated!);
  }

  async remove(id: number, currentUser: any): Promise<ISucces> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException(`Uyga vazifa ID ${id} topilmadi`);

    if (currentUser.role === UserRole.TEACHER && assignment.createdById !== currentUser.id) {
      throw new ForbiddenException("Siz faqat o'zingiz yaratgan uyga vazifani o'chira olasiz");
    }

    await this.assignmentRepo.delete(id);
    return succesRes({ message: "Uyga vazifa o'chirildi" });
  }

  async submit(userId: number, dto: SubmitHomeworkDto): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const assignment = await this.assignmentRepo.findOne({ where: { id: dto.assignmentId } });
    if (!assignment) throw new NotFoundException('Uyga vazifa topilmadi');

    if (assignment.groupId !== student.groupId) {
      throw new ForbiddenException('Bu uyga vazifa sizning guruhingizga tegishli emas');
    }

    if (!dto.textContent?.trim() && !dto.fileData) {
      throw new BadRequestException('Matn yoki fayl kiritilishi shart');
    }

    let fileSizeBytes: number | undefined;
    if (dto.fileData) {
      const base64 = dto.fileData.split(',').pop() ?? dto.fileData;
      fileSizeBytes = Math.ceil((base64.length * 3) / 4);
      if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `Fayl hajmi juda katta (maksimal ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB)`,
        );
      }
    }

    const existingCurrent = await this.submissionRepo.findOne({
      where: { assignmentId: dto.assignmentId, studentId: student.id, isCurrent: true },
    });
    if (existingCurrent) {
      throw new ForbiddenException(
        "Siz bu uyga vazifani allaqachon topshirgansiz. Qayta topshirish uchun ustoz ruxsati kerak.",
      );
    }

    const attemptCount = await this.submissionRepo.count({
      where: { assignmentId: dto.assignmentId, studentId: student.id },
    });

    const submission = this.submissionRepo.create({
      assignmentId: dto.assignmentId,
      studentId: student.id,
      attempt: attemptCount + 1,
      isCurrent: true,
      textContent: dto.textContent,
      fileName: dto.fileData ? dto.fileName : undefined,
      fileData: dto.fileData,
      fileSizeBytes,
      status: HomeworkSubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    });
    const saved = await this.submissionRepo.save(submission);
    return succesRes(saved, 201);
  }

  async resetSubmission(assignmentId: number, studentId: number, currentUser: any): Promise<ISucces> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Uyga vazifa topilmadi');

    if (currentUser.role === UserRole.TEACHER) {
      const group = await this.groupRepo.findOne({ where: { id: assignment.groupId, teacherId: currentUser.id } });
      if (!group) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz o'quvchilariga ruxsat bera olasiz");
      }
    }

    const current = await this.submissionRepo.findOne({
      where: { assignmentId, studentId, isCurrent: true },
    });
    if (!current) {
      throw new NotFoundException("Bu o'quvchining bu vazifa bo'yicha faol topshirig'i topilmadi");
    }

    await this.submissionRepo.update(current.id, { isCurrent: false });
    return succesRes({ message: "O'quvchiga qayta topshirishga ruxsat berildi" });
  }

  async grade(submissionId: number, dto: GradeHomeworkDto, currentUser: any): Promise<ISucces> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });
    if (!submission) throw new NotFoundException('Topshiriq topilmadi');

    if (currentUser.role === UserRole.TEACHER) {
      const group = await this.groupRepo.findOne({
        where: { id: submission.assignment.groupId, teacherId: currentUser.id },
      });
      if (!group) {
        throw new ForbiddenException("Siz faqat o'z guruhingiz topshiriqlarini baholay olasiz");
      }
    }

    submission.score = dto.score;
    submission.feedback = dto.feedback;
    submission.status = HomeworkSubmissionStatus.GRADED;
    submission.gradedAt = new Date();
    submission.gradedById = currentUser.id;
    const saved = await this.submissionRepo.save(submission);

    void this.gamificationService.awardForHomework(submission.studentId, submission.id, dto.score);

    return succesRes(saved);
  }

  async getSubmissions(assignmentId: number, currentUser: any): Promise<ISucces> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Uyga vazifa topilmadi');

    if (currentUser.role === UserRole.TEACHER) {
      const group = await this.groupRepo.findOne({ where: { id: assignment.groupId, teacherId: currentUser.id } });
      if (!group) throw new ForbiddenException("Siz faqat o'z guruhingiz topshiriqlarini ko'ra olasiz");
    }

    const submissions = await this.submissionRepo.find({
      where: { assignmentId, isCurrent: true },
      relations: ['student', 'student.user'],
      order: { submittedAt: 'DESC' },
    });
    return succesRes(submissions);
  }

  async getMySubmission(assignmentId: number, userId: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const submissions = await this.submissionRepo.find({
      where: { assignmentId, studentId: student.id },
      order: { attempt: 'DESC' },
    });
    return succesRes(submissions);
  }

  async purgeExpiredFiles(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - FILE_RETENTION_DAYS);

    await this.submissionRepo
      .createQueryBuilder()
      .update(HomeworkSubmission)
      .set({
        fileData: () => 'NULL',
        fileName: () => 'NULL',
        fileExpired: true,
      })
      .where('"submittedAt" < :cutoff', { cutoff })
      .andWhere('"fileExpired" = false')
      .andWhere('"fileData" IS NOT NULL')
      .execute();
  }
}
