import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Badge } from '@prisma/client';
import * as BadgeDTO from './badge.dto';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BadgeService {
  private logger = new Logger('Badge service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<BadgeDTO.PageableResponseDto> {
    this.logger.log('getAllUsers by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const items = await this.prisma.badge.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.badge.count();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<BadgeDTO.BadgeResponse[]> {
    this.logger.log('getAllBadges');
    const badges = await this.prisma.badge.findMany();

    return badges;
  }

  async getById(id): Promise<BadgeDTO.BadgeResponse> {
    this.logger.log('badgeById');

    const badge = await this.prisma.badge.findUnique({
      where: { id },
    });

    return badge;
  }

  async create(data: BadgeDTO.Create): Promise<BadgeDTO.BadgeResponse> {
    this.logger.log('createBadge');

    const createdBadge = await this.prisma.badge.create({ data });

    return createdBadge;
  }

  async updateBadge({ payload }: { payload: BadgeDTO.Update }): Promise<Badge> {
    this.logger.log('updateBadge');

    const updateBadge = await this.prisma.badge.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateBadge;
  }

  async deleteBadge({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteBadge');

    await this.prisma.badge.delete({
      where: { id },
    });

    return true;
  }
}
