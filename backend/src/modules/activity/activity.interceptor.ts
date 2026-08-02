import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        const userId = req?.user?.id;
        if (!userId) return;

        const method = req.method;
        const path = req.originalUrl || req.url;
        const ip =
          req.headers['x-forwarded-for']?.toString()?.split(',')?.[0] ||
          req.ip ||
          req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];

        this.activityService.touchUser(userId).catch(() => undefined);

        this.activityService
          .logActivity({
            userId,
            method,
            path,
            statusCode: res.statusCode,
            ip,
            userAgent,
          })
          .catch(() => undefined);
      }),
    );
  }
}
