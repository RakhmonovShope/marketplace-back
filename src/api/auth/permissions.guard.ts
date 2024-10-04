import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from './auth.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PERMISSIONS[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roleId) {
      throw new UnauthorizedException(
        'User not authenticated or roleId missing',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      select: { permissions: true },
    });

    if (!role) {
      throw new ForbiddenException('User role not found.');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      role.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
