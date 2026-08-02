import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { Group } from 'src/databases/entities/group.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateTeacherDto): Promise<ISucces> {
    const exists = await this.userRepo.findOne({ where: [{ username: dto.username }, { phone: dto.phone }] });
    if (exists) {
      if (exists.username === dto.username) throw new ConflictException('username allaqachon mavjud');
      throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    const hashed = await this.crypto.hashPassword(dto.password);
    // directionIds dan birinchisini asosiy directionId sifatida saqla
    const directionId = dto.directionId ?? (dto.directionIds?.length ? dto.directionIds[0] : undefined);
    const user = this.userRepo.create({ ...dto, password: hashed, role: UserRole.TEACHER, directionId });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return succesRes(result, 201);
  }

  async findAll(query?: any): Promise<ISucces> {
    const where: any = { role: UserRole.TEACHER };
    if (query?.directionId) where.directionId = Number(query.directionId);
    if (query?.branchId) where.branchId = Number(query.branchId);
    if (query?.name) where.fullName = ILike(`%${query.name}%`);
    const users = await this.userRepo.find({ where, relations: ['direction', 'branch'], order: { createdAt: 'DESC' } });
    // Hamkasblar bir-birining maoshini ko'rmasligi kerak — buni faqat /auth/me orqali o'zi ko'radi.
    const result = users.map(({ password: _, salary: __, ...u }) => u);
    return succesRes(result);
  }

  async findOne(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.TEACHER }, relations: ['direction'] });
    if (!user) throw new NotFoundException(`Teacher ID ${id} topilmadi`);
    const { password: _, salary: __, ...result } = user;
    return succesRes(result);
  }
  async getMyGroups(teacherId: number): Promise<ISucces> {
    const groups = await this.groupRepo.find({
      where: { teacherId },
      relations: ['students', 'students.user', 'direction'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(groups);
  }

  async update(id: number, dto: UpdateTeacherDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.TEACHER } });
    if (!user) throw new NotFoundException(`Teacher ID ${id} topilmadi`);
    if (dto.username && dto.username !== user.username) {
      const dup = await this.userRepo.findOne({ where: { username: dto.username, id: Not(id) } });
      if (dup) throw new ConflictException('username allaqachon mavjud');
    }
    if (dto.phone && dto.phone !== user.phone) {
      const dup = await this.userRepo.findOne({ where: { phone: dto.phone, id: Not(id) } });
      if (dup) throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    if (dto.password) dto.password = await this.crypto.hashPassword(dto.password);
    // directionIds yangilansa directionId ham yangilansin
    if (dto.directionIds?.length) (dto as any).directionId = dto.directionIds[0];
    await this.userRepo.update(id, dto as any);
    const updated = await this.userRepo.findOne({ where: { id }, relations: ['direction'] });
    const { password: _, ...result } = updated!;
    return succesRes(result);
  }

  async remove(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.TEACHER } });
    if (!user) throw new NotFoundException(`Teacher ID ${id} topilmadi`);
    const groupsCount = await this.groupRepo.count({ where: { teacherId: id } });
    if (groupsCount > 0) {
      throw new ConflictException(`Bu teacher ${groupsCount} ta guruhga biriktirilgan. Avval guruhlarni ozgartiring.`);
    }
    await this.userRepo.delete(id);
    return succesRes({ message: 'Teacher muvaffaqiyatli ochirildi' });
  }
}
