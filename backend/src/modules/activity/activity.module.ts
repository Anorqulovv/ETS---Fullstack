import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivity } from 'src/databases/entities/user-activity.entity';
import { User } from 'src/databases/entities/user.entity';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityInterceptor } from './activity.interceptor';

@Module({
  imports: [
    JwtModule.register({}),TypeOrmModule.forFeature([UserActivity, User])],
  controllers: [ActivityController],
  providers: [
    ActivityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityInterceptor,
    },
  ],
  exports: [ActivityService],
})
export class ActivityModule {}
