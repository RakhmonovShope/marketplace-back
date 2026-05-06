import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as AuthDTO from './auth.dto';
import { ConfigService } from '@nestjs/config';

interface TokenPayload {
  id: string;
}

interface AuthMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private logger = new Logger('Auth service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signUp(data: AuthDTO.SignUp): Promise<User> {
    this.logger.log('signUp');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const createUser = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return createUser;
  }

  async signIn(
    data: AuthDTO.SignIn,
    meta: AuthMeta = {},
  ): Promise<AuthDTO.TokensResponseDto> {
    this.logger.log('signIn');

    const user = await this.prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Please check your login credentials');
    }

    return this.issueTokens(user.id, meta);
  }

  async getMe(accessToken: string): Promise<User> {
    this.logger.log('getMe');

    try {
      const decoded = this.jwtService.verify(accessToken);

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token', error);
    }
  }

  async refresh(
    refreshToken: string,
    meta: AuthMeta = {},
  ): Promise<AuthDTO.TokensResponseDto> {
    this.logger.log('refresh');

    // 1) Refresh token ni JWT sifatida tekshiramiz
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2) DB da bu token mavjudmi tekshiramiz
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    if (stored.userId !== payload.id) {
      throw new UnauthorizedException('Token mismatch');
    }

    // 2.1) Token reuse detection — agar revoked tokenni qayta ishlatishga
    // urinishsa, bu o'g'irlangan deb hisoblanadi: foydalanuvchining
    // barcha sessiyalarini revoke qilamiz.
    if (stored.revokedAt) {
      this.logger.warn(
        `Token reuse detected for user ${stored.userId}; revoking all sessions`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Token reuse detected, all sessions revoked',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // 3) Eski refresh tokenni revoke qilamiz (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // 4) Yangi 2 ta token chiqaramiz
    return this.issueTokens(payload.id, meta);
  }

  // ===== LOGOUT =====
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    this.logger.log('logout');

    const tokenHash = this.hashToken(refreshToken);

    // tokenni topib revoke qilamiz (xato bo'lsa ham foydalanuvchini chalg'itmaymiz)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  // ===== LOGOUT FROM ALL DEVICES =====
  async logoutAll(userId: string): Promise<{ success: boolean }> {
    this.logger.log('logoutAll');

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  // ===== CLEANUP =====
  /**
   * DB da to'planib qoladigan eski tokenlarni tozalaydi:
   *  - muddati o'tib ketgan tokenlar
   *  - 30 kundan ortiq oldin revoke qilingan tokenlar
   * Har kuni yarim tunda ishlaydi.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('cleanupExpiredTokens');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null, lt: thirtyDaysAgo } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired/revoked refresh tokens`);
    }
  }

  // ===== HELPERS =====

  /** 2 ta token (access + refresh) yaratib, refresh ni DB ga yozib qaytaradi */
  private async issueTokens(
    userId: string,
    meta: AuthMeta,
  ): Promise<AuthDTO.TokensResponseDto> {
    const payload: TokenPayload = { id: userId };

    // Access — qisqa muddatli, default JwtModule sozlamasi bilan
    const accessToken = this.jwtService.sign(payload);

    // Refresh — alohida secret va uzoqroq muddat
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Refresh tokenni DB ga hash qilib saqlaymiz
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.calculateExpiry(
      this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  /** Tokenni SHA-256 bilan hash qilamiz (DB da xom token saqlamaslik uchun) */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** "7d", "15m", "3600s" formatlarini Date ga aylantiradi */
  private calculateExpiry(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // default — 7 kun
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
