import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { envConfig } from '../config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth) {
      throw new UnauthorizedException('Unauthorized');
    }
    const bearar = auth.split(' ')[0];
    const token = auth.split(' ')[1];
    if (bearar !== 'Bearer' || !token) {
      throw new UnauthorizedException('Unauthorized');
    }
    try {
      const data = this.jwt.verify(token, {
        secret: envConfig.TOKEN.ACCESS_TOKEN_KEY,
      });

      if (!data || !data.isActive) {
        throw new UnauthorizedException('token expired or user is not active');
      }

      req.user = data;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token expired');
    }
  }
}
