import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from 'src/databases/entities/parent.entity';
import { Student } from 'src/databases/entities/student.entity';
import { User } from 'src/databases/entities/user.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { UsersService } from 'src/modules/users/users.service';
import { UserRole } from 'src/common/enums/role.enum';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly usersService: UsersService,
  ) { }

  // ==================== CREATE ====================
  async createWithUser(userDto: CreateUserDto): Promise<ISucces> {
    const userResult = await this.usersService.createUser(userDto, UserRole.PARENT);
    const newUser = userResult.data as any;

    const parent = this.parentRepo.create({ userId: newUser.id });
    const saved = await this.parentRepo.save(parent);
    return succesRes({ user: newUser, parent: saved }, 201);
  }

  // Mavjud user uchun parent profil qo'shish
  async create(dto: CreateParentDto): Promise<ISucces> {
    const user = await this.usersService.getRepository.findOne({
      where: { id: dto.userId, role: UserRole.PARENT },
    });
    if (!user) throw new NotFoundException('PARENT roli bilan user topilmadi');

    const exists = await this.parentRepo.findOneBy({ userId: dto.userId });
    if (exists) throw new ConflictException('Bu user uchun parent profil allaqachon mavjud');

    const parent = this.parentRepo.create(dto);
    const saved = await this.parentRepo.save(parent);
    return succesRes(saved, 201);
  }

  // ==================== READ ====================
  async findAll(): Promise<ISucces> {
    const parents = await this.parentRepo.find({
      relations: ['user', 'students', 'students.user'],
      order: { createdAt: 'DESC' },
    });
    const safeParents = parents.map((p) => {
      const { user, students, ...rest } = p as any;
      const safeUser = user ? (({ password: _pw, ...u }) => u)(user) : user;
      const safeStudents = (students ?? []).map((s: any) => {
        const { user: su, ...srest } = s;
        return { ...srest, user: su ? (({ password: _pw2, ...u2 }) => u2)(su) : su };
      });
      return { ...rest, user: safeUser, students: safeStudents };
    });
    return succesRes(safeParents);
  }

  async findOne(id: number): Promise<ISucces> {
    const parent = await this.parentRepo.findOne({
      where: { id },
      relations: ['user', 'students', 'students.group'],
    });
    if (!parent) throw new NotFoundException(`Parent ID ${id} topilmadi`);
    const { user, ...rest } = parent as any;
    const safeUser = user ? (({ password: _pw, ...u }) => u)(user) : user;
    return succesRes({ ...rest, user: safeUser });
  }

  async getMyChildren(parentUserId: number): Promise<ISucces> {
    const children = await this.studentRepo.find({
      where: { parent: { userId: parentUserId } },
      relations: ['user', 'group', 'group.teacher'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(children);
  }

  // ==================== UPDATE ====================
  async update(id: number, dto: UpdateParentDto): Promise<ISucces> {
    const existing = await this.parentRepo.findOneBy({ id });
    if (!existing) throw new NotFoundException(`Parent ID ${id} topilmadi`);

    const { fullName, username, phone, password, telegramId, gender, ...parentFields } = dto;
    const userFields = { fullName, username, phone, password, telegramId, gender };
    const hasUserFields = Object.values(userFields).some((v) => v !== undefined);

    if (hasUserFields) {
      await this.usersService.updateUser(existing.userId, userFields as any);
    }

    if (Object.keys(parentFields).length > 0) {
      await this.parentRepo.update(id, parentFields as any);
    }

    const updated = await this.parentRepo.findOne({
      where: { id },
      relations: ['user', 'students'],
    });
    return succesRes(updated);
  }

  // ==================== DELETE ====================
  async remove(id: number): Promise<ISucces> {
    const existing = await this.parentRepo.findOne({
      where: { id },
      relations: ['students'],
    });
    if (!existing) throw new NotFoundException(`Parent ID ${id} topilmadi`);

    if (existing.students?.length > 0) {
      throw new ConflictException(
        `Bu ota-ona ${existing.students.length} nafar o'quvchiga bog'langan. Avval bog'lanishlarni o'chiring.`,
      );
    }

    await this.usersService.removeUser(existing.userId);
    return succesRes({ message: 'Parent muvaffaqiyatli o\'chirildi' });
  }
}
