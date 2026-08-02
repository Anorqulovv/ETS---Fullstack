import { ISucces } from './succes-interface';

export const succesRes = (data: any, statusCode: number = 200): ISucces => {
  return {
    statusCode,
    message: 'succes',
    data,
  };
};
