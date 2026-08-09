import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnv } from './common/config/env.validation';

// Core
import { AuthModule } from './modules/auth/auth.module';
import { envConfig } from './common/config';

// Role-based modules
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { SupportModule } from './modules/support/support.module';

// Feature modules
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GroupsModule } from './modules/groups/groups.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TestsModule } from './modules/tests/tests.module';
import { StudentsModule } from './modules/student/student.module';
import { ParentsModule } from './modules/parent/parent.module';
import { DirectionModule } from './modules/directions/directions.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { OtpModule } from './modules/otp/otp.module';
import { BranchesModule } from './modules/branches/branches.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityModule } from './modules/activity/activity.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { StaffModule } from './modules/staff/staff.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { UsersModule } from './modules/users/users.module';
import { SalaryModule } from './modules/salary/salary.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global rate limiting — a generous default so normal app usage (a dashboard firing
    // several parallel requests, etc.) is never affected. Sensitive auth endpoints
    // (login, OTP, refresh) get their own much stricter limits via @Throttle() directly
    // on those routes in auth.controller.ts — this default is just the safety net for
    // every other endpoint against basic abuse/scripted hammering.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 daqiqa (millisekundda)
        limit: 120, // shu IP'dan daqiqasiga 120 so'rov
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: envConfig.DB_URL,
      // MUHIM: synchronize endi HAR DOIM false. Bazadagi o'zgarishlar endi
      // FAQAT `src/migrations/`dagi migratsiyalar orqali amalga oshiriladi
      // (qarang: src/data-source.ts va package.json'dagi migration:* scriptlari).
      // Bu, masalan, kimdir yangi entity/ustun qo'shsa-yu, lekin migratsiya
      // yozmasa, ishlab chiqarish bazasi "sukut bo'yicha" o'zgarib ketmasligini
      // kafolatlaydi.
      synchronize: false,
      // Ilova ishga tushganda migratsiyalar avtomatik qo'llaniladi (deploy paytida
      // qo'lda `npm run migration:run` chaqirishni unutib qo'yish xavfini kamaytiradi).
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      autoLoadEntities: true,
      logging: !isProduction ? ['error', 'warn'] : ['error'],
    }),
    // Auth
    AuthModule,

    // Rol modullari
    AdminModule,
    TeacherModule,
    SupportModule,

    // Feature modullari
    AttendanceModule,
    GroupsModule,
    TelegramModule,
    TestsModule,
    StudentsModule,
    ParentsModule,
    DirectionModule,
    QuestionsModule,
    OtpModule,
    BranchesModule,
    NotificationsModule,
    ActivityModule,
    PaymentsModule,
    PermissionsModule,
    StaffModule,
    GamificationModule,
    UsersModule,
    SalaryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
