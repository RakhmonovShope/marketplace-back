import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as AdminDTO from './admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private logger = new Logger('Admin service');

  constructor(private readonly prisma: PrismaService) {}

  async admin(id: string): Promise<AdminDTO.UserResponseDto> {
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

  async createAdmin(
    payload: AdminDTO.Create,
  ): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('createAdmin');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(payload.password, salt);

    const createAdmin = await this.prisma.user.create({
      data: { ...payload, password: hashedPassword },
    });

    return createAdmin;
  }

  async updateAdmin(
    payload: AdminDTO.Update,
  ): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('updateAdmin');

    const updateAdmin = await this.prisma.user.update({
      where: {
        id: payload.id,
      },
      data: payload,
    });
    return updateAdmin;
  }

  async deleteAdmin(id: string): Promise<string> {
    this.logger.log('deleteAdmin');

    await this.prisma.user.delete({
      where: { id },
    });

    return 'deleted';
  }
}
