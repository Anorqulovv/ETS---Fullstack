import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CryptoService } from 'src/infrastructure/helpers/Crypto';
import { TokenService } from 'src/infrastructure/helpers/Token';
import { succesRes } from 'src/infrastructure/utils/succes-res';
import { User } from 'src/databases/entities/user.entity';
import { UserRole } from 'src/common/enums/role.enum';
import { LoginDto } from './dto/login';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly token: TokenService,
    private readonly otpService: OtpService,
  ) {}

  // Username + Password login
  async signIn(dto: LoginDto) {
    const { username, password } = dto;

    const user = await this.userRepo.findOne({ where: { username } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Login yoki parol xato');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akkaunt faol emas. Administratorga murojaat qiling',
      );
    }

    const isMatch = await this.crypto.comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Login yoki parol xato');
    }

    const payload = {
      id: user.id,
      role: user.role,
      username: user.username,
      isActive: user.isActive,
      grantedRoles: user.grantedRoles ?? [],
    };

    const now = new Date();
    await this.userRepo.update(user.id, { lastLoginAt: now, lastSeenAt: now });

    const tokens = await this.token.generateTokens(payload);
    const { password: _pw, ...safeUser } = {
      ...user,
      lastLoginAt: now,
      lastSeenAt: now,
    };

    return succesRes({ token: tokens, user: safeUser });
  }

  // Refresh token bilan yangi access token olish
  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.token.checkRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati tugagan');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki faol emas');
    }

    const newPayload = {
      id: user.id,
      role: user.role,
      username: user.username,
      isActive: user.isActive,
      grantedRoles: user.grantedRoles ?? [],
    };

    const tokens = await this.token.generateTokens(newPayload);
    return succesRes({ token: tokens });
  }

  // Telefon + OTP orqali login
  async requestOtpLogin(phone: string) {
    return this.otpService.sendOtp(phone);
  }

  async verifyOtpLogin(phone: string, code: string) {
    await this.otpService.verifyOtp(phone, code);

    const normalized = phone.replace(/[^\+\d]/g, '');
    const user = await this.userRepo.findOne({
      where: {
        phone: normalized.startsWith('+') ? normalized : '+' + normalized,
      },
    });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    if (!user.isActive) {
      throw new UnauthorizedException('Akkaunt faol emas');
    }

    const payload = {
      id: user.id,
      role: user.role,
      username: user.username,
      isActive: user.isActive,
      grantedRoles: user.grantedRoles ?? [],
    };

    const now = new Date();
    await this.userRepo.update(user.id, { lastLoginAt: now, lastSeenAt: now });

    const tokens = await this.token.generateTokens(payload);
    const { password: _pw, ...safeUser } = {
      ...user,
      lastLoginAt: now,
      lastSeenAt: now,
    };

    return succesRes({ token: tokens, user: safeUser });
  }

  // Foydalanuvchi o'z profilini olish
  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['direction'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    const { password: _, ...safe } = user;
    return succesRes(safe);
  }

  // Profil yangilash
  async updateProfile(
    userId: number,
    dto: {
      fullName?: string;
      username?: string;
      phone?: string;
      avatar?: string;
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['direction'],
    });

    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi');
    }

    const { oldPassword, newPassword, confirmPassword, ...profileData } = dto;

    // Ism va telefon — faqat SUPERADMIN/ADMIN o'zi o'zgartira oladi (masalan, ustoz yoki
    // o'quvchi buni administratorsiz o'zgartira olmasligi kerak).
    const canEditNameAndPhone =
      user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN;
    if (!canEditNameAndPhone) {
      delete (profileData as any).fullName;
      delete (profileData as any).phone;
    }

    const updateData: Partial<User> = { ...profileData };

    const wantsPasswordChange = Boolean(
      oldPassword || newPassword || confirmPassword,
    );

    if (wantsPasswordChange) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        throw new BadRequestException(
          "Parolni o'zgartirish uchun eski parol, yangi parol va tasdiqlash paroli kerak",
        );
      }

      if (newPassword.length < 8) {
        throw new BadRequestException(
          "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak",
        );
      }

      if (newPassword !== confirmPassword) {
        throw new BadRequestException(
          "Yangi parol va tasdiqlash paroli mos emas",
        );
      }

      if (!user.password) {
        throw new BadRequestException(
          "Bu foydalanuvchida parol mavjud emas",
        );
      }

      const isOldPasswordValid = await this.crypto.comparePassword(
        oldPassword,
        user.password,
      );

      if (!isOldPasswordValid) {
        throw new BadRequestException("Eski parol noto'g'ri");
      }

      updateData.password = await this.crypto.hashPassword(newPassword);
    }

    await this.userRepo.update(userId, updateData);

    const updated = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['direction'],
    });

    const { password: _, ...safe } = updated!;
    return succesRes(safe);
  }
}
