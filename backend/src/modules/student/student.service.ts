import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from 'src/databases/entities/student.entity';
import { Parent } from 'src/databases/entities/parent.entity';
import { User } from 'src/databases/entities/user.entity';
import { Group } from 'src/databases/entities/group.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UsersService } from 'src/modules/users/users.service';
import { UserRole } from 'src/common/enums/role.enum';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { Gender } from 'src/common/enums/gender.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly telegramService: TelegramService,
  ) { }

  // ==================== CREATE ====================
  async createWithUser(
    userDto: CreateUserDto,
    studentExtra: Omit<CreateStudentDto, 'userId'>,
    parentDto?: { fullName: string; phone: string; phone2?: string; username?: string; password?: string; telegramId?: string; gender?: Gender },
  ): Promise<ISucces> {
    if (studentExtra?.groupId) {
      const group = await this.groupRepo.findOneBy({ id: studentExtra.groupId });
      if (!group) throw new NotFoundException(`Guruh ID ${studentExtra.groupId} topilmadi`);

      // Guruh ichidan o'quvchi yaratilsa, filial majburan guruh filialidan olinadi
      if (group.branchId) {
        (userDto as any).branchId = group.branchId;
      }
    }

    const userResult = await this.usersService.createUser(userDto, UserRole.STUDENT);
    const newUser = userResult.data as any;

    const student = this.studentRepo.create({ userId: newUser.id, ...studentExtra });
    const saved = await this.studentRepo.save(student);

    // Agar parent ma'lumotlari berilgan bo'lsa — parent yaratish va biriktirish
    let savedParent: any = null;
    if (parentDto?.fullName && parentDto?.phone) {
      const parentUserResult = await this.usersService.createUser(
        {
          fullName: parentDto.fullName,
          phone: parentDto.phone,
          username: parentDto.username || `parent_${Date.now()}`,
          password: parentDto.password || `Parent@${Math.random().toString(36).slice(2, 8)}`,
          telegramId: parentDto.telegramId,
          // gender is required on CreateUserDto but this inline parent-creation path (student +
          // new parent in one request) doesn't currently collect it in the UI — fall back rather
          // than fail the whole student creation over a missing gender for the parent.
          gender: parentDto.gender ?? Gender.MALE,
        },
        UserRole.PARENT,
      );
      const newParentUser = parentUserResult.data as any;
      const newParent = this.parentRepo.create({
        userId: newParentUser.id,
        phone2: parentDto.phone2 || undefined,
      });
      savedParent = await this.parentRepo.save(newParent);

      // Student ga parentId biriktirish
      await this.studentRepo.update(saved.id, { parentId: savedParent.id });
    }

    // Admin va superadminlarga xabar
    await this.telegramService.notifyAdmins(
      `🎓 <b>Yangi o'quvchi qo'shildi!</b>\n\n👤 <b>Ism:</b> ${newUser.fullName}\n📞 <b>Tel:</b> ${newUser.phone}\n🆔 <b>ID:</b> ${newUser.id}${savedParent ? '\n👨‍👩‍👦 Ota-ona biriktirildi' : ''}`
    );

    return succesRes({ user: newUser, student: saved, parent: savedParent }, 201);
  }

  async create(dto: CreateStudentDto): Promise<ISucces> {
    const user = await this.usersService.getRepository.findOneBy({ id: dto.userId });
    if (!user || user.role !== UserRole.STUDENT) {
      throw new NotFoundException('STUDENT roli bilan user topilmadi');
    }

    const exists = await this.studentRepo.findOneBy({ userId: dto.userId });
    if (exists) throw new NotFoundException('Bu user uchun student profil allaqachon mavjud');

    if (dto.groupId) {
      const group = await this.groupRepo.findOneBy({ id: dto.groupId });
      if (!group) throw new NotFoundException(`Guruh ID ${dto.groupId} topilmadi`);

      if (group.branchId) {
        await this.usersService.updateUser(dto.userId, { branchId: group.branchId } as any);
      }
    }

    const student = this.studentRepo.create({
      ...dto,
      cardId: dto.cardId?.trim() || undefined,
    });

    const saved = await this.studentRepo.save(student);
    return succesRes(saved, 201);
  }

  // ==================== READ ====================
  async findAll(currentUser: any): Promise<ISucces> {
    let students: Student[];

    if ([UserRole.SUPERADMIN, UserRole.ADMIN].includes(currentUser.role)) {
      students = await this.studentRepo.find({
        relations: ['user', 'parent', 'group', 'group.teacher'],
        order: { createdAt: 'DESC' },
      });
    } else if (currentUser.role === UserRole.SUPPORT) {
      // Support faqat o'z yo'nalishidagi guruhlarning o'quvchilarini ko'radi
      students = await this.studentRepo.find({
        where: { group: { direction: { id: currentUser.directionId } } },
        relations: ['user', 'parent', 'group', 'group.direction'],
        order: { createdAt: 'DESC' },
      });
    } else {
      // Teacher faqat o'z guruhidagi studentlarni ko'radi
      students = await this.studentRepo.find({
        where: { group: { teacherId: currentUser.id } },
        relations: ['user', 'parent', 'group'],
        order: { createdAt: 'DESC' },
      });
    }

    return succesRes(students);
  }

  async findOne(id: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: [
        'user',
        'parent',
        'parent.user',
        'group',
        'group.teacher',
        'group.direction',
        'attendance',
        'results',
        'results.test',
      ],
      order: { results: { id: 'DESC' } } as any,
    });
    if (!student) throw new NotFoundException(`Student ID ${id} topilmadi`);

    const results = student.results ?? [];
    const totalTests = results.length;
    const avgScore = totalTests > 0
      ? Math.round(results.reduce((sum: number, r: any) => sum + r.score, 0) / totalTests)
      : 0;
    const passedTests = results.filter((r: any) => r.score >= (r.test?.minScore ?? 60)).length;
    const failedTests = totalTests - passedTests;

    return succesRes({
      ...student,
      stats: {
        totalTests,
        avgScore,
        passedTests,
        failedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      },
    });
  }

  // ==================== UPDATE ====================
  async update(id: number, dto: UpdateStudentDto): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: ['user', 'parent', 'parent.user'],
    });
    if (!student) throw new NotFoundException(`Student ID ${id} topilmadi`);

    let groupBranchId: number | undefined;

    if (dto.groupId) {
      const group = await this.groupRepo.findOneBy({ id: dto.groupId });
      if (!group) throw new NotFoundException(`Guruh ID ${dto.groupId} topilmadi`);

      groupBranchId = group.branchId || undefined;
    }

    // Student jadvalidagi maydonlarni ajratamiz
    const { fullName, username, phone, password, telegramId, branchId, gender, parent: parentDto, ...studentFields } = dto as any;

    const updateData: Partial<any> = { ...studentFields };
    if ('cardId' in updateData) {
      updateData.cardId = updateData.cardId?.trim() || undefined;
    }

    await this.studentRepo.update(id, updateData);

    // O'quvchi user ma'lumotlarini yangilash
    const userUpdateData: any = {};
    if (fullName !== undefined) userUpdateData.fullName = fullName;
    if (username !== undefined) userUpdateData.username = username;
    if (phone !== undefined) userUpdateData.phone = phone;
    if (password !== undefined) userUpdateData.password = password;
    if (telegramId !== undefined) userUpdateData.telegramId = telegramId;
    if (gender !== undefined) userUpdateData.gender = gender;

    if (groupBranchId !== undefined) {
      userUpdateData.branchId = groupBranchId;
    } else if (branchId !== undefined) {
      userUpdateData.branchId = branchId;
    }

    if (Object.keys(userUpdateData).length > 0 && student.userId) {
      await this.usersService.updateUser(student.userId, userUpdateData);
    }

    // ==================== PARENT YANGILASH / YARATISH ====================
    if (parentDto && Object.keys(parentDto).length > 0) {
      if (student.parentId) {
        // Mavjud parent bor — user ma'lumotlarini yangilaymiz
        const existingParent = await this.parentRepo.findOne({
          where: { id: student.parentId },
          relations: ['user'],
        });

        if (existingParent) {
          const parentUserUpdate: any = {};
          if (parentDto.fullName !== undefined) parentUserUpdate.fullName = parentDto.fullName;
          if (parentDto.phone !== undefined) parentUserUpdate.phone = parentDto.phone;
          if (parentDto.telegramId !== undefined) parentUserUpdate.telegramId = parentDto.telegramId;
          if (parentDto.username !== undefined) parentUserUpdate.username = parentDto.username;
          if (parentDto.password !== undefined) parentUserUpdate.password = parentDto.password;

          if (Object.keys(parentUserUpdate).length > 0) {
            await this.usersService.updateUser(existingParent.userId, parentUserUpdate);
          }

          // phone2 ni parent entityda yangilash
          if (parentDto.phone2 !== undefined) {
            await this.parentRepo.update(existingParent.id, { phone2: parentDto.phone2 });
          }
        }
      } else {
        // Parent yo'q — yangi parent + user yaratamiz
        // fullName va phone majburiy bo'lsa ham, bo'sh qoldirmaslik uchun tekshiramiz
        if (parentDto.fullName && parentDto.phone) {
          const parentUser = await this.usersService.createUser(
            {
              fullName: parentDto.fullName,
              phone: parentDto.phone,
              username: parentDto.username || `parent_${Date.now()}`,
              password: parentDto.password || `Parent@${Math.random().toString(36).slice(2, 8)}`,
              telegramId: parentDto.telegramId,
              gender: parentDto.gender ?? Gender.MALE,
            },
            UserRole.PARENT,
          );

          const newParentUser = parentUser.data as any;
          const newParent = this.parentRepo.create({
            userId: newParentUser.id,
            phone2: parentDto.phone2 || undefined,
          });
          const savedParent = await this.parentRepo.save(newParent);

          // Student ga parentId biriktirish
          await this.studentRepo.update(id, { parentId: savedParent.id });
        }
      }
    }

    const updated = await this.studentRepo.findOne({
      where: { id },
      relations: ['user', 'parent', 'parent.user', 'group'],
    });

    return succesRes(updated);
  }

  // ==================== SUPERADMIN / ADMIN: o'quvchilar + ota-onalar ID lari ====================
  async findAllWithParentIds(): Promise<ISucces> {
    const students = await this.studentRepo.find({
      relations: ['user', 'parent', 'parent.user', 'group'],
      order: { createdAt: 'DESC' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      studentUserId: s.userId,
      fullName: s.user?.fullName ?? '—',
      phone: s.user?.phone ?? '—',
      username: s.user?.username ?? '—',
      isActive: s.user?.isActive ?? false,
      groupName: s.group?.name ?? '—',
      groupId: s.groupId ?? null,
      cardId: s.cardId ?? null,
      parentId: s.parentId ?? null,
      parentUserId: s.parent?.userId ?? null,
      parentFullName: s.parent?.user?.fullName ?? null,
      parentPhone: s.parent?.user?.phone ?? null,
      parentTelegramId: s.parent?.user?.telegramId ?? null,
    }));

    return succesRes(result);
  }


  async remove(id: number): Promise<ISucces> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!student) throw new NotFoundException(`Student ID ${id} topilmadi`);
    await this.usersService.removeUser(student.userId);
    return succesRes({ message: "Student va uning user akkaunt muvaffaqiyatli o'chirildi" });
  }
}
