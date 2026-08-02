import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

/**
 * One service shared by the four new operational roles (Manager, Marketing, Sales, Finance) —
 * they're all just User rows filtered by role, identical in shape to how Teacher/Support/Admin
 * already work, so there's no need for four near-identical copy-pasted services.
 */
@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
  ) {}

  async create(role: UserRole, dto: CreateStaffDto): Promise<ISucces> {
    const exists = await this.userRepo.findOne({
      where: [{ username: dto.username }, { phone: dto.phone }],
    });
    if (exists) {
      if (exists.username === dto.username) throw new ConflictException('username allaqachon mavjud');
      throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    const hashed = await this.crypto.hashPassword(dto.password);
    const user = this.userRepo.create({ ...dto, password: hashed, role });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return succesRes(result, 201);
  }

  async findAll(role: UserRole): Promise<ISucces> {
    const users = await this.userRepo.find({
      where: { role },
      relations: ['branch'],
      order: { createdAt: 'DESC' },
    });
    return succesRes(users.map(({ password: _, ...u }) => u));
  }

  async findOne(role: UserRole, id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role }, relations: ['branch'] });
    if (!user) throw new NotFoundException(`Foydalanuvchi ID ${id} topilmadi`);
    const { password: _, ...result } = user;
    return succesRes(result);
  }

  async update(role: UserRole, id: number, dto: UpdateStaffDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role } });
    if (!user) throw new NotFoundException(`Foydalanuvchi ID ${id} topilmadi`);
    const payload: Partial<User> = { ...dto };
    if (dto.password) {
      payload.password = await this.crypto.hashPassword(dto.password);
    }
    await this.userRepo.update(id, payload);
    const updated = await this.userRepo.findOne({ where: { id } });
    const { password: _, ...result } = updated!;
    return succesRes(result);
  }

  async remove(role: UserRole, id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role } });
    if (!user) throw new NotFoundException(`Foydalanuvchi ID ${id} topilmadi`);
    await this.userRepo.delete(id);
    return succesRes({ message: "O'chirildi" });
  }
}
