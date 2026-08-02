import { IResponsePagination } from '../utils/succes-interface';

export class Pager<T> {
  private constructor(
    private statusCode: number,
    private message: string,
    private data: Array<T>,
    private totalElements: number,
    private totalPages: number,
    private pageSize: number,
    private currentPage: number,
    private from: number,
    private to: number,
  ) {}

  public static of<T>(
    statusCode: number,
    message: string,
    data: Array<T>,
    totalElements: number,
    pageSize: number,
    currentPage: number,
  ): IResponsePagination {
    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalElements);

    return new Pager(
      statusCode,
      message,
      data,
      totalElements,
      Math.ceil(totalElements / pageSize),
      pageSize,
      currentPage,
      from,
      to,
    ).toPage();
  }

  public toPage(): IResponsePagination {
    return {
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      totalElements: this.totalElements,
      totalPages: this.totalPages,
      pageSize: this.pageSize,
      currentPage: this.currentPage,
      from: this.from,
      to: this.to,
    };
  }
}
