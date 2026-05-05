import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS } from './auth.enum';

import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis.module';

const ROLE_CACHE_TTL_SECONDS = 5 * 60; // 5 daqiqa
const ROLE_CACHE_PREFIX = 'role:permissions:';

export const rolePermissionsCacheKey = (roleId: string): string =>
  `${ROLE_CACHE_PREFIX}${roleId}`;

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PERMISSIONS[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roleId) {
      throw new UnauthorizedException(
        'User not authenticated or roleId missing',
      );
    }

    const permissions = await this.getRolePermissions(user.roleId);

    const hasPermission = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }

  private async getRolePermissions(roleId: string): Promise<string[]> {
    const key = rolePermissionsCacheKey(roleId);

    // 1) Cache hit
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as string[];
      }
    } catch (err) {
      // Redis tushib qolsa ham app ishlashda davom etsin
      this.logger.warn(`Redis GET failed: ${(err as Error).message}`);
    }

    // 2) Cache miss → DB
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });

    if (!role) {
      throw new ForbiddenException('User role not found.');
    }

    // 3) Redis ga saqlaymiz (xato bo'lsa ham asosiy oqim buzilmasin)
    try {
      await this.redis.set(
        key,
        JSON.stringify(role.permissions),
        'EX',
        ROLE_CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Redis SET failed: ${(err as Error).message}`);
    }

    return role.permissions;
  }
}
