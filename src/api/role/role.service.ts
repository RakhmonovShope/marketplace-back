import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ERR } from '../../common/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as RoleDTO from './role.dto';
import { ConfigService } from '@nestjs/config';
import { getWhereOperations } from 'helpers';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';

import { REDIS_CLIENT } from '../../common/redis.module';
import { rolePermissionsCacheKey } from '../auth/permissions.guard';
import Redis from 'ioredis';

@Injectable()
export class RoleService {
  private logger = new Logger('Role service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<RoleDTO.PageableResponseDto> {
    this.logger.log('getAllRoles by pageable');
    const {
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = getWhereOperations(filter);

    const [roles, totalItems] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id: string): Promise<RoleDTO.RoleResponse> {
    this.logger.log('roleById');

    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(data: RoleDTO.Create): Promise<RoleDTO.RoleResponse> {
    this.logger.log('createRole');

    const createdRole = await this.prisma.role.create({ data });

    return createdRole;
  }

  async updateRole({ payload }: { payload: RoleDTO.Update }): Promise<Role> {
    this.logger.log('updateRole');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updateRole = await this.prisma.role.update({
      where: { id },
      data,
    });

    await this.invalidateRoleCache(id);

    return updateRole;
  }

  async deleteRole({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteRole');

    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { isSystem: true, _count: { select: { User: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Tizim rollari (SUPER_ADMIN, CUSTOMER, ...) kod ichida ishlatiladi — o'chirib bo'lmaydi.
    if (role.isSystem) {
      throw new ConflictException({
        code: ERR.SYSTEM_ROLE,
        message: 'System role cannot be deleted',
      });
    }

    // Foydalanuvchilar bog'langan bo'lsa FK xatosi (500/400) o'rniga aniq 409.
    if (role._count.User > 0) {
      throw new ConflictException({
        code: ERR.ROLE_IN_USE,
        message: `Role is assigned to ${role._count.User} user(s)`,
      });
    }

    await this.prisma.role.delete({
      where: { id },
    });

    await this.invalidateRoleCache(id);

    return true;
  }

  private async invalidateRoleCache(roleId: string): Promise<void> {
    try {
      await this.redis.del(rolePermissionsCacheKey(roleId));
    } catch (err) {
      this.logger.warn(
        `Failed to invalidate role cache: ${(err as Error).message}`,
      );
    }
  }
}
