import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
import { Branch } from 'src/databases/entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}


  private async checkBranchDuplicate(name?: string, excludeId?: number) {
    if (!name?.trim()) return;

    const exists = await this.branchRepo.findOne({
      where: { name: ILike(name.trim()) },
    });

    if (exists && exists.id !== excludeId) {
      throw new BadRequestException("Bu filial nomi allaqachon mavjud");
    }
  }

  async create(dto: CreateBranchDto): Promise<ISucces> {
    await this.checkBranchDuplicate(dto.name);
    const branch = this.branchRepo.create(dto);
    const saved = await this.branchRepo.save(branch);
    return succesRes(saved, 201);
  }

  async findAll(name?: string): Promise<ISucces> {
    const where = name ? { name: ILike(`%${name}%`) } : {};
    const data = await this.branchRepo.find({ where, order: { name: 'ASC' } });
    return succesRes(data);
  }

  async findOne(id: number): Promise<ISucces> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException(`Filial ID ${id} topilmadi`);
    return succesRes(branch);
  }

  async update(id: number, dto: UpdateBranchDto): Promise<ISucces> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException(`Filial ID ${id} topilmadi`);
    if (dto.name) {
      await this.checkBranchDuplicate(dto.name, id);
    }
    await this.branchRepo.update(id, dto);
    const updated = await this.branchRepo.findOne({ where: { id } });
    return succesRes(updated!);
  }

  async remove(id: number): Promise<ISucces> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException(`Filial ID ${id} topilmadi`);
    await this.branchRepo.delete(id);
    return succesRes({ message: 'Filial o\'chirildi' });
  }
}
