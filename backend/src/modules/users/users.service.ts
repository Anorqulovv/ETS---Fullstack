import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { BaseService } from 'src/infrastructure/utils/BaseService';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { envConfig } from 'src/common/config';
import { ISucces, IResponsePagination } from 'src/infrastructure/utils/succes-interface';

@Injectable()
export class UsersService
  extends BaseService<CreateUserDto, UpdateUserDto, User>
  implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
  ) {
    super(userRepo);
  }

  async onModuleInit() {
    const existsSuperAdmin = await this.userRepo.findOne({
      where: { role: UserRole.SUPERADMIN },
    });

    if (!existsSuperAdmin) {
      let phone = envConfig.SUPERADMIN.PHONE;
      phone = phone.replace(/[^+\d]/g, '');
      if (!phone.startsWith('+998')) {
        phone = '+998' + phone.replace(/^\+?998?/, '');
      }

      const superAdmin = this.userRepo.create({
        username: envConfig.SUPERADMIN.USERNAME,
        phone,
        password: await this.crypto.hashPassword(envConfig.SUPERADMIN.PASSWORD),
        role: UserRole.SUPERADMIN,
        fullName: 'Super Admin',
      });

      await this.userRepo.save(superAdmin);
      console.log(`✅ Superadmin yaratildi: ${phone}`);
    }
  }

  // ==================== CREATE ====================
  async createUser(dto: CreateUserDto, role: UserRole): Promise<ISucces> {
    const { username, phone, password } = dto;

    const exists = await this.userRepo.findOne({
      where: [{ username }, { phone }],
    });

    if (exists) {
      if (exists.username === username)
        throw new ConflictException('username already exists');
      if (exists.phone === phone)
        throw new ConflictException('phone already exists');
    }

    const hashPass = await this.crypto.hashPassword(password);

    // directionIds dan birinchisini directionId sifatida saqla
    const directionId = dto.directionId ?? (dto.directionIds && dto.directionIds.length > 0 ? dto.directionIds[0] : undefined);

    const user = this.userRepo.create({
      ...dto,
      password: hashPass,
      role,
      directionId,
    });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;

    return succesRes(result, 201);
  }

  // ==================== READ ====================
  // Umumiy ro'yxat — barcha rollar, ixtiyoriy filtrlar (?role=&directionId=&branchId=&name=)
  // va sahifalash (?page=&limit=). BaseService.findAll() dan farqli o'laroq, parolni hech
  // qachon qaytarmaydi.
  async findAllUsers(query?: any): Promise<IResponsePagination> {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;

    const where: any = {};
    if (query?.role) where.role = query.role;
    if (query?.directionId) where.directionId = Number(query.directionId);
    if (query?.branchId) where.branchId = Number(query.branchId);
    if (query?.name) where.fullName = ILike(`%${query.name}%`);

    const [users, count] = await this.userRepo.findAndCount({
      where,
      relations: ['direction', 'branch'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    const data = users.map(({ password: _, ...user }) => user);

    const from = count === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, count);
    return {
      statusCode: 200,
      message: 'succes',
      data: data as any,
      totalElements: count,
      totalPages: Math.ceil(count / limit) || 0,
      pageSize: limit,
      currentPage: page,
      from,
      to,
    };
  }

  async findAllByRole(role: UserRole, query?: any): Promise<ISucces> {
    const where: any = { role }

    if (query?.directionId) where.directionId = Number(query.directionId)
    if (query?.branchId) where.branchId = Number(query.branchId)
    if (query?.name) where.fullName = ILike(`%${query.name}%`)

    const users = await this.userRepo.find({
      where,
      relations: ['direction', 'branch'],
      order: { createdAt: 'DESC' },
    })
    const result = users.map(({ password: _, ...user }) => user)
    return succesRes(result)
  }

  async findOneByRole(id: number, role: UserRole): Promise<ISucces> {
    const user = await this.userRepo.findOne({
      where: { id, role },
      relations: ['direction', 'branch'],
    });
    if (!user) throw new NotFoundException(`${role} with ID ${id} not found`);

    const { password: _, ...result } = user;
    return succesRes(result);
  }

  async findOneById(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['direction', 'branch'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    const { password: _, ...result } = user;
    return succesRes(result);
  }

  // ==================== UPDATE ====================
  async updateUser(id: number, dto: UpdateUserDto): Promise<ISucces> {
    const current = await this.userRepo.findOneBy({ id });
    if (!current) throw new NotFoundException(`User with ID ${id} not found`);

    if (dto.username && dto.username !== current.username) {
      const dup = await this.userRepo.findOne({
        where: { username: dto.username, id: Not(id) },
      });
      if (dup) throw new ConflictException('username already exists');
    }

    if (dto.phone && dto.phone !== current.phone) {
      const dup = await this.userRepo.findOne({
        where: { phone: dto.phone, id: Not(id) },
      });
      if (dup) throw new ConflictException('phone already exists');
    }

    if (dto.password) {
      dto.password = await this.crypto.hashPassword(dto.password);
    }

    // directionIds yangilansa directionId ham yangilansin
    if (dto.directionIds && dto.directionIds.length > 0) {
      (dto as any).directionId = dto.directionIds[0];
    }

    await this.userRepo.update(id, dto);
    const updated = await this.userRepo.findOne({
      where: { id },
      relations: ['direction', 'branch'],
    });
    const { password: _, ...result } = updated!;
    return succesRes(result);
  }

  // ==================== DELETE ====================
  async removeUser(id: number): Promise<ISucces> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    await this.userRepo.delete(id);
    return succesRes({ message: 'Successfully deleted' });
  }

  // ==================== STATS (Dashboard) ====================
  async getDashboardStats(): Promise<ISucces> {
    const [totalAdmins, totalTeachers, totalSupports, totalParents] =
      await Promise.all([
        this.userRepo.count({ where: { role: UserRole.ADMIN } }),
        this.userRepo.count({ where: { role: UserRole.TEACHER } }),
        this.userRepo.count({ where: { role: UserRole.SUPPORT } }),
        this.userRepo.count({ where: { role: UserRole.PARENT } }),
      ]);

    return succesRes({ totalAdmins, totalTeachers, totalSupports, totalParents });
  }
}
