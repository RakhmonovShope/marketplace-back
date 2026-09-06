import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Badge } from '@prisma/client';
import * as BadgeDTO from './badge.dto';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';
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
    this.logger.log('getAllBadges by pageable');
    const {
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = getWhereOperations(filter);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.badge.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.badge.count({ where }),
    ]);

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id): Promise<BadgeDTO.BadgeResponse> {
    this.logger.log('badgeById');

    const badge = await this.prisma.badge.findUnique({
      where: { id },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return badge;
  }

  async create(data: BadgeDTO.Create): Promise<BadgeDTO.BadgeResponse> {
    this.logger.log('createBadge');

    const createdBadge = await this.prisma.badge.create({ data });

    return createdBadge;
  }

  async updateBadge({ payload }: { payload: BadgeDTO.Update }): Promise<Badge> {
    this.logger.log('updateBadge');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updateBadge = await this.prisma.badge.update({
      where: { id },
      data,
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
