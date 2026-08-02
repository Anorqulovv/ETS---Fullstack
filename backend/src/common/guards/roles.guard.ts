import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPERADMIN hamma endpointga kirishi mumkin
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Superadmin tomonidan qo'shimcha berilgan huquqlar (masalan support'ga teacher huquqi)
    const grantedRoles: string[] = Array.isArray(user.grantedRoles) ? user.grantedRoles : [];
    if (grantedRoles.some((r) => requiredRoles.includes(r))) {
      return true;
    }

    throw new ForbiddenException('Forbidden: sizda bu amalni bajarish huquqi yo\'q');
  }
}
