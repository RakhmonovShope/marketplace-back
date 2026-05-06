import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from '../admin';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate({ id, sid }: { id: string; sid: string }): Promise<User> {
    if (!sid) {
      throw new UnauthorizedException('Session is missing in token');
    }

    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sid },
    });

    if (!session || session.userId !== id || session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.adminService.admin(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
