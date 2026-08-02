import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
  ) { }

  async create(dto: CreateSupportDto): Promise<ISucces> {
    const exists = await this.userRepo.findOne({ where: [{ username: dto.username }, { phone: dto.phone }] });
    if (exists) {
      if (exists.username === dto.username) throw new ConflictException('username allaqachon mavjud');
      throw new ConflictException('telefon raqami allaqachon mavjud');
    }
    const hashed = await this.crypto.hashPassword(dto.password);
    // directionIds dan birinchisini asosiy directionId sifatida saqla
    const directionId = dto.directionId ?? (dto.directionIds?.length ? dto.directionIds[0] : undefined);
    const user = this.userRepo.create({ ...dto, password: hashed, role: UserRole.SUPPORT, directionId });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return succesRes(result, 201);
  }

  async findAll(query?: any): Promise<ISucces> {
    const where: any = { role: UserRole.SUPPORT };
    if (query?.directionId) where.directionId = Number(query.directionId);
    if (query?.branchId) where.branchId = Number(query.branchId);

    const users = await this.userRepo.find({
      where,
      relations: ['direction', 'branch'],
      order: { createdAt: 'DESC' }
    });
    const result = users.map(({ password: _, salary: __, ...u }) => u);
    return succesRes(result);
  }

  async findOne(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({
      where: { id, role: UserRole.SUPPORT },
      relations: ['direction'], // ✅ qo'shildi
    });
    if (!user) throw new NotFoundException(`Support ID ${id} topilmadi`);
    const { password: _, ...result } = user;
    return succesRes(result);
  }

  async update(id: number, dto: UpdateSupportDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.SUPPORT } });
    if (!user) throw new NotFoundException(`Support ID ${id} topilmadi`);
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
    if ((dto as any).directionIds?.length) (dto as any).directionId = (dto as any).directionIds[0];
    await this.userRepo.update(id, dto as any);
    const updated = await this.userRepo.findOne({ where: { id } });
    const { password: _, ...result } = updated!;
    return succesRes(result);
  }

  async remove(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id, role: UserRole.SUPPORT } });
    if (!user) throw new NotFoundException(`Support ID ${id} topilmadi`);
    await this.userRepo.delete(id);
    return succesRes({ message: 'Support muvaffaqiyatli ochirildi' });
  }
}
