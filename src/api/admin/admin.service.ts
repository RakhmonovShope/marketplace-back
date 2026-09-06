import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as AdminDTO from './admin.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';
import { getWhereOperations } from '../../helpers';
import { toUserResponse } from './admin.mapper';

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
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = { ...getWhereOperations(filter), deletedAt: null };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      data: items.map(toUserResponse),
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async admin(id: string): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('adminById');

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserResponse(user);
  }

  async createAdmin(
    payload: AdminDTO.Create,
  ): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('createAdmin');

    // bcrypt cost — BCRYPT_ROUNDS env (default 12), AuthService.hashPassword bilan bir xil.
    const hashedPassword = await bcrypt.hash(
      payload.password,
      this.config.get<number>('BCRYPT_ROUNDS', 12),
    );

    const createAdmin = await this.prisma.user.create({
      data: { ...payload, password: hashedPassword },
    });

    return toUserResponse(createAdmin);
  }

  async updateAdmin(
    payload: AdminDTO.Update,
  ): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('updateAdmin');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updateAdmin = await this.prisma.user.update({
      where: { id },
      data,
    });

    return toUserResponse(updateAdmin);
  }

  async deleteAdmin(id: string): Promise<string> {
    this.logger.log('deleteAdmin');

    const { count } = await this.prisma.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('User not found or already deleted');
    }

    return 'deleted';
  }

  async restoreAdmin(id: string): Promise<AdminDTO.UserResponseDto> {
    this.logger.log('restoreAdmin');

    const { count } = await this.prisma.user.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    if (count === 0) {
      throw new NotFoundException('Deleted user not found');
    }

    const restored = await this.prisma.user.findUniqueOrThrow({
      where: { id },
    });

    return toUserResponse(restored);
  }
}
