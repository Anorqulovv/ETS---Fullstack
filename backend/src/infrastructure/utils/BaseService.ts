import { HttpException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import {
  IFindOptions,
  IResponsePagination,
  ISucces,
} from './succes-interface';
import { succesRes } from './succes-res';
import { RepositoryPager } from '../pagination';

export class BaseService<
  CreateDto,
  UpdateDto,
  Entity extends { id: number },
> {
  constructor(protected readonly repository: Repository<Entity>) {}

  get getRepository(): Repository<Entity> {
    return this.repository;
  }

  async create(dto: CreateDto): Promise<ISucces> {
    const entity = this.repository.create(dto as DeepPartial<Entity>);
    const data = await this.repository.save(entity);
    return succesRes(data, 201);
  }

  async findAll(options?: IFindOptions<Entity>): Promise<ISucces> {
    const data = await this.repository.find({
      ...(options as any),
    });

    return succesRes(data);
  }

  async findAllWithPagination(
    options?: IFindOptions<Entity>,
  ): Promise<IResponsePagination> {
    return await RepositoryPager.findAll(this.getRepository, options);
  }

  async findOneBy(options: IFindOptions<Entity>): Promise<ISucces> {
    const data = await this.repository.findOne({
      ...(options as any),
    });

    if (!data) {
      throw new HttpException('not found', 404);
    }

    return succesRes(data);
  }

  async findOneById(
    id: number,
    options?: IFindOptions<Entity>,
  ): Promise<ISucces> {
    const data = await this.repository.findOne({
      ...(options as any),
      where: {
        ...(options?.where as FindOptionsWhere<Entity>),
        id,
      } as FindOptionsWhere<Entity>,
    });

    if (!data) {
      throw new HttpException('not found', 404);
    }

    return succesRes(data);
  }

  async update(id: number, dto: UpdateDto): Promise<ISucces> {
    await this.findOneById(id);

    await this.repository.update(id as any, dto as any);

    const data = await this.repository.findOne({
      where: { id } as FindOptionsWhere<Entity>,
    });

    return succesRes(data);
  }

  async delete(id: number): Promise<ISucces> {
    await this.findOneById(id);
    await this.repository.delete(id as any);

    return succesRes({ message: 'Successfully deleted' });
  }
}