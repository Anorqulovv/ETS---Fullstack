import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';
import { GrantRolesDto } from './dto/grant-roles.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async grantRoles(userId: number, dto: GrantRolesDto): Promise<ISucces> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Foydalanuvchi ID ${userId} topilmadi`);

    // SUPERADMIN'ga qo'shimcha rol berishning ma'nosi yo'q — u allaqachon hamma narsaga kira oladi.
    // Foydalanuvchining o'z asosiy roliga ham qayta "grant" berilmaydi (ortiqcha).
    const cleaned = Array.from(new Set(dto.grantedRoles)).filter(
      (r) => r !== UserRole.SUPERADMIN && r !== user.role,
    );

    user.grantedRoles = cleaned;
    await this.userRepo.save(user);

    return succesRes({
      id: user.id,
      role: user.role,
      grantedRoles: user.grantedRoles,
      note: 'Foydalanuvchi keyingi safar tizimga kirganda yoki tokeni yangilanganda kuchga kiradi',
    });
  }

  async listGrantable(): Promise<ISucces> {
    const users = await this.userRepo.find({
      where: {},
      select: ['id', 'fullName', 'username', 'role', 'grantedRoles'],
      order: { fullName: 'ASC' },
    });
    return succesRes(users.filter((u) => u.role !== UserRole.SUPERADMIN));
  }
}
