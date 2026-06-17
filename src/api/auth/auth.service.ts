import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { User, VERIFICATION_TOKEN_TYPE } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as AuthDTO from './auth.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../common/mail/mail.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface TokenPayload {
  id: string;
  sid: string;
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
    private readonly mail: MailService,
    private readonly eventEmitter: EventEmitter2,
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

    this.eventEmitter.emit('user.registered', {
      userId: createUser.id,
      email: createUser.email,
    });

    return createUser;
  }

  async signIn(
    data: AuthDTO.SignIn,
    meta: AuthMeta = {},
  ): Promise<AuthDTO.TokensResponseDto> {
    this.logger.log('signIn');

    const user = await this.prisma.user.findFirst({
      where: {
        phone: data.phone,
        deletedAt: null, // o'chirilgan foydalanuvchi tizimga kira olmasin
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Please check your login credentials');
    }

    // Email tasdiqlanmagan bo'lsa token bermaymiz: foydalanuvchi avval
    // emailini tasdiqlashi kerak ('resend-verification' orqali xatni qayta olishi mumkin).
    if (!user.emailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    return this.issueTokens(user.id, meta);
  }

  async getMe(accessToken: string): Promise<User> {
    this.logger.log('getMe');

    let decoded: TokenPayload;
    try {
      decoded = this.jwtService.verify<TokenPayload>(accessToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token', error);
    }

    if (!decoded.sid) {
      throw new UnauthorizedException('Session is missing in token');
    }

    const session = await this.prisma.refreshToken.findUnique({
      where: { id: decoded.sid },
    });

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: decoded.id, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
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

  // ===== EMAIL VERIFICATION =====

  /**
   * Foydalanuvchi email manzilini tasdiqlaydi.
   * Token bir martalik: tekshirilgach `usedAt` to'ldiriladi.
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    this.logger.log('verifyEmail');

    const stored = await this.findValidVerificationToken(
      token,
      VERIFICATION_TOKEN_TYPE.EMAIL_VERIFICATION,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  /**
   * Email tasdiqlash xatini qayta yuboradi.
   * Email enumeration'dan saqlanish uchun foydalanuvchi topilmasa ham 'success'
   * qaytaramiz (xuddi yuborilgandek ko'rinadi).
   */
  async resendVerification(email: string): Promise<{ success: boolean }> {
    this.logger.log('resendVerification');

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return { success: true };
    }

    if (user.emailVerified) {
      // Allaqachon tasdiqlangan — qayta yubormaymiz, lekin foydalanuvchini
      // chalg'itmaymiz.
      return { success: true };
    }

    await this.sendEmailVerification(user.id, user.email);
    return { success: true };
  }

  // ===== PASSWORD RESET =====

  /**
   * "Parolni unutdim" oqimi. Email mavjudligini foydalanuvchiga aytmaymiz
   * (enumeration himoyasi), shuning uchun har doim 'success' qaytaramiz.
   */
  async forgotPassword(email: string): Promise<{ success: boolean }> {
    this.logger.log('forgotPassword');

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return { success: true };
    }

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = this.calculateExpiry(
      this.config.get('PASSWORD_RESET_TTL', '1h'),
    );

    // Eski ishlatilmagan reset tokenlarni revoke qilamiz (faqat bittasi amal qiladi).
    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: VERIFICATION_TOKEN_TYPE.PASSWORD_RESET,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: VERIFICATION_TOKEN_TYPE.PASSWORD_RESET,
        expiresAt,
      },
    });

    await this.mail.sendPasswordResetEmail(user.email, rawToken);
    return { success: true };
  }

  /**
   * Reset linkdan kelgan token bilan yangi parol o'rnatadi.
   * Yangi parol o'rnatilgach, barcha sessiyalarni revoke qilamiz —
   * agar akkaunt o'g'irlangan bo'lsa, hujumchi tokenlari yaroqsiz bo'ladi.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    this.logger.log('resetPassword');

    const stored = await this.findValidVerificationToken(
      token,
      VERIFICATION_TOKEN_TYPE.PASSWORD_RESET,
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.verificationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  // ===== CLEANUP =====
  /**
   * DB da to'planib qoladigan eski tokenlarni tozalaydi:
   *  - muddati o'tib ketgan refresh tokenlar
   *  - 30 kundan ortiq oldin revoke qilingan refresh tokenlar
   *  - muddati o'tgan yoki 30 kundan ortiq ishlatilgan verification tokenlar
   * Har kuni yarim tunda ishlaydi.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('cleanupExpiredTokens');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [refreshResult, verificationResult] = await Promise.all([
      this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { not: null, lt: thirtyDaysAgo } },
          ],
        },
      }),
      this.prisma.verificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { not: null, lt: thirtyDaysAgo } },
          ],
        },
      }),
    ]);

    if (refreshResult.count > 0) {
      this.logger.log(
        `Deleted ${refreshResult.count} expired/revoked refresh tokens`,
      );
    }
    if (verificationResult.count > 0) {
      this.logger.log(
        `Deleted ${verificationResult.count} expired/used verification tokens`,
      );
    }
  }

  // ===== HELPERS =====

  /**
   * Email tasdiqlash tokeni yaratadi, DB'ga hash'ini yozadi va xom tokenni email'da yuboradi.
   * Eski ishlatilmagan tokenlarni revoke qiladi — bir vaqtda faqat bittasi amal qilsin.
   */
  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = this.calculateExpiry(
      this.config.get('EMAIL_VERIFICATION_TTL', '15m'),
    );

    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: {
          userId,
          type: VERIFICATION_TOKEN_TYPE.EMAIL_VERIFICATION,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId,
          tokenHash,
          type: VERIFICATION_TOKEN_TYPE.EMAIL_VERIFICATION,
          expiresAt,
        },
      }),
    ]);

    await this.mail.sendVerificationEmail(email, rawToken);
  }

  /** 2 ta token (access + refresh) yaratib, refresh ni DB ga yozib qaytaradi */
  private async issueTokens(
    userId: string,
    meta: AuthMeta,
  ): Promise<AuthDTO.TokensResponseDto> {
    // Sessiya id (sid) — RefreshToken yozuvining birlamchi kaliti.
    // Access tokenni shu sid bilan bog'laymiz, shunda logout/logoutAll
    // refreshTokenni revoke qilganda accessToken ham yaroqsiz bo'ladi.
    const sid = crypto.randomUUID();
    const payload: TokenPayload = { id: userId, sid };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.calculateExpiry(
      this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        id: sid,
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

  /** Email/URL uchun xavfsiz tasodifiy token (32 bayt = 64 ta hex belgi) */
  private generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Berilgan xom tokenni hash'lab, DB'dan amal qiluvchi (used/expired emas) yozuvni topadi.
   * Aks holda BadRequestException ko'taradi.
   */
  private async findValidVerificationToken(
    rawToken: string,
    type: VERIFICATION_TOKEN_TYPE,
  ) {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.type !== type) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (stored.usedAt) {
      throw new BadRequestException('Token has already been used');
    }

    if (stored.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    return stored;
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
