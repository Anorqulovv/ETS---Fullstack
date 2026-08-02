import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateAdminDto): Promise<ISucces> {
    const exists = await this.userRepo.findOne({ where: [{ username: dto.username }, { phone: dto.phone }] });
    if (exists) {
      if (exists.username === dto.username) throw new ConflictException('username allaqachon mavjud');
      throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    const hashed = await this.crypto.hashPassword(dto.password);
    const user = this.userRepo.create({ ...dto, password: hashed, role: UserRole.ADMIN });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return succesRes(result, 201);
  }

  async findAll(): Promise<ISucces> {
    const users = await this.userRepo.find({
      where: { role: UserRole.ADMIN },
      relations: ['direction'],
      order: { createdAt: 'DESC' },
    });
    const result = users.map(({ password: _, ...u }) => u);
    return succesRes(result);
  }

  async findOne(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.ADMIN }, relations: ['direction'] });
    if (!user) throw new NotFoundException(`Admin ID ${id} topilmadi`);
    const { password: _, ...result } = user;
    return succesRes(result);
  }

  async update(id: number, dto: UpdateAdminDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.ADMIN } });
    if (!user) throw new NotFoundException(`Admin ID ${id} topilmadi`);
    if (dto.username && dto.username !== user.username) {
      const dup = await this.userRepo.findOne({ where: { username: dto.username, id: Not(id) } });
      if (dup) throw new ConflictException('username allaqachon mavjud');
    }
    if (dto.phone && dto.phone !== user.phone) {
      const dup = await this.userRepo.findOne({ where: { phone: dto.phone, id: Not(id) } });
      if (dup) throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    if (dto.password) dto.password = await this.crypto.hashPassword(dto.password);
    await this.userRepo.update(id, dto as any);
    const updated = await this.userRepo.findOne({ where: { id }, relations: ['direction'] });
    const { password: _, ...result } = updated!;
    return succesRes(result);
  }

  async remove(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.ADMIN } });
    if (!user) throw new NotFoundException(`Admin ID ${id} topilmadi`);
    await this.userRepo.delete(id);
    return succesRes({ message: 'Admin muvaffaqiyatli ochirildi' });
  }
}
