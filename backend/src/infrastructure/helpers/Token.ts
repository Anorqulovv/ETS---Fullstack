import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {UserRole} from '../../common/enums/role.enum'
import { envConfig } from 'src/common/config';

export type TokenPayload = {
  id: number;
  role: UserRole;
  isActive: boolean;
  grantedRoles?: UserRole[];
};

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: envConfig.TOKEN.ACCESS_TOKEN_KEY,
      expiresIn: envConfig.TOKEN.ACCESS_TOKEN_TIME,
    });
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: envConfig.TOKEN.REFRESH_TOKEN_KEY,
      expiresIn: envConfig.TOKEN.REFRESH_TOKEN_TIME,
    });
  }

  async generateTokens(payload: TokenPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  async checkAccessToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: envConfig.TOKEN.ACCESS_TOKEN_KEY,
    });
  }

  async checkRefreshToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: envConfig.TOKEN.REFRESH_TOKEN_KEY,
    });
  }
}