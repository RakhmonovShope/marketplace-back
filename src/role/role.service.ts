import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as RoleDTO from './role.dto';

@Injectable()
export class RoleService {
  private logger = new Logger('Role service');

  constructor(private readonly prisma: PrismaService) {}

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
