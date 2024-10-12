import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as RoleDTO from './role.dto';
import { PageableResponseDto } from './role.dto';
import { ConfigService } from '@nestjs/config';

interface Filter {
  name: string;
  operation: '>' | '>=' | '<' | '<=' | '=' | '!=';
  value: string | number;
}

@Injectable()
export class RoleService {
  private logger = new Logger('Role service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: RoleDTO.PaginationFilterOrderRequest,
  ): Promise<PageableResponseDto> {
    this.logger.log('getAllRoles by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const where: Prisma.RoleWhereInput = {};

    filter.forEach((f: Filter) => {
      const fieldName = f.name;
      const value: any = f.value;

      switch (f.operation) {
        case '>':
          where[fieldName] = { gt: value };
          break;
        case '>=':
          where[fieldName] = { gte: value };
          break;
        case '<':
          where[fieldName] = { lt: value };
          break;
        case '<=':
          where[fieldName] = { lte: value };
          break;
        case '=':
          where[fieldName] = { equals: value };
          break;
        case '!=':
          where[fieldName] = { not: value };
          break;
        default:
          throw new Error(`Unsupported filter operation: ${f.operation}`);
      }
    });

    const roles = await this.prisma.role.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalCount = await this.prisma.role.count({ where });

    return {
      data: roles,
      totalCount,
      totalPages: Math.ceil(totalCount / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<RoleDTO.RoleResponse[]> {
    this.logger.log('getAllRoles');
    const roles = await this.prisma.role.findMany();

    return roles;
  }

  async getById(id): Promise<RoleDTO.RoleResponse> {
    this.logger.log('roleById');

    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    return role;
  }

  async create(data: RoleDTO.Create): Promise<RoleDTO.RoleResponse> {
    this.logger.log('createRole');

    const createdRole = await this.prisma.role.create({ data });

    return createdRole;
  }

  async updateRole({ payload }: { payload: RoleDTO.Update }): Promise<Role> {
    this.logger.log('updateRole');

    const updateRole = await this.prisma.role.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateRole;
  }

  async deleteRole({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteRole');

    await this.prisma.role.delete({
      where: { id },
    });

    return true;
  }
}
