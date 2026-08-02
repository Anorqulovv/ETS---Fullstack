import { FindManyOptions } from 'typeorm';

export interface ISucces {
  statusCode: number;
  message: string;
  data: object;
}

export interface IResponsePagination extends ISucces {
  totalElements: number;
  totalPages: number;
  pageSize: number;
  currentPage: number;
  from: number;
  to: number;
}

export interface IFindOptions<T> extends FindManyOptions<T> {}
