import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
import { Direction } from 'src/databases/entities/direction.entity';
import { CreateDirectionDto } from './dto/create-direction.dto';
import { UpdateDirectionDto } from './dto/update-direction.dto';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { ISucces } from 'src/infrastructure/utils/succes-interface';

@Injectable()
export class DirectionService {
  constructor(
    @InjectRepository(Direction) private directionRepo: Repository<Direction>,
  ) { }

  async create(dto: CreateDirectionDto): Promise<ISucces> {
    const exists = await this.directionRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Bu nomdagi yo‘nalish allaqachon mavjud');

    const direction = this.directionRepo.create(dto);
    const saved = await this.directionRepo.save(direction);
    return succesRes(saved, 201);
  }

  async findAll(name?: string) {
    const where = name ? { name: ILike(`%${name}%`) } : {}
    const data = await this.directionRepo.find({
      where,
      order: { name: 'ASC' }
    })
    return succesRes(data)
  }

  async findOne(id: number) {
    const data = await this.directionRepo.findOne({ where: { id } });
    if (!data) throw new NotFoundException(`Yo‘nalish ID ${id} topilmadi`);
    return succesRes(data);
  }

  async update(id: number, dto: UpdateDirectionDto): Promise<ISucces> {
    const direction = await this.directionRepo.findOne({ where: { id } });
    if (!direction) throw new NotFoundException(`Yo‘nalish ID ${id} topilmadi`);

    if (dto.name) {
      const exists = await this.directionRepo.findOne({
        where: { name: dto.name, id: Not(id) },   // ← Endi xato yo‘q
      });
      if (exists) throw new ConflictException('Bu nomdagi yo‘nalish allaqachon mavjud');
    }

    await this.directionRepo.update(id, dto);
    const updated = await this.directionRepo.findOne({ where: { id } });
    return succesRes(updated!);
  }

  async remove(id: number): Promise<ISucces> {
    const direction = await this.directionRepo.findOne({ where: { id } });
    if (!direction) throw new NotFoundException(`Yo‘nalish ID ${id} topilmadi`);

    await this.directionRepo.delete(id);
    return succesRes({ message: 'Yo‘nalish o‘chirildi' });
  }
}