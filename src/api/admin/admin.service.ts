import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as AdminDTO from './admin.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { getWhereOperations } from '../../helpers';

@Injectable()
export class AdminService {
  private logger = new Logger('Admin service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<AdminDTO.PageableResponseDto> {
    this.logger.log('getAllUsers by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const items = await this.prisma.user.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.user.count();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

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
