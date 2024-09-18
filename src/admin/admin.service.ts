import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class AdminService {
  private logger = new Logger('Admin service');

  constructor(private readonly prisma: PrismaService) {}

  async admin(
    adminWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    this.logger.log('adminById');

    const user = await this.prisma.user.findUnique({
      where: adminWhereUniqueInput,
    });
    return user;
  }

  async getAllAdmins() {
    this.logger.log('getAllAdmins');
    const admins = await this.prisma.user.findMany();
    return admins;
  }

  async updateAdmin(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    this.logger.log('updateAdmin');

    const updateAdmin = await this.prisma.user.update({
      where: params.where,
      data: params.data,
    });
    return updateAdmin;
  }

  async deleteAdmin(where: Prisma.UserWhereUniqueInput): Promise<User> {
    this.logger.log('deleteAdmin');
    const deleteAdmin = await this.prisma.user.delete({
      where,
    });
    return deleteAdmin;
  }
}
