import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

@Injectable()
export class CryptoService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  async comparePassword(password: string, hashed: string): Promise<boolean> {
    return compare(password, hashed);
  }
}
