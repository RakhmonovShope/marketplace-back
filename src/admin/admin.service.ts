import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as AdminDTO from './admin.dto';

@Injectable()
export class AdminService {
  private logger = new Logger('Admin service');

  constructor(private readonly prisma: PrismaService) {}

  async admin(id: string): Promise<User | null> {
    this.logger.log('adminById');

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user;
  }

  async getAllAdmins() {
    this.logger.log('getAllAdmins');
    const admins = await this.prisma.user.findMany();

    return admins;
  }

  async updateAdmin(payload: AdminDTO.Update): Promise<User> {
    this.logger.log('updateAdmin');

    const updateAdmin = await this.prisma.user.update({
      where: {
        id: payload.id,
      },
      data: payload,
    });
    return updateAdmin;
  }

  async deleteAdmin(id: string): Promise<User> {
    this.logger.log('deleteAdmin');
    const deleteAdmin = await this.prisma.user.delete({
      where: { id },
    });
    return deleteAdmin;
  }
}
