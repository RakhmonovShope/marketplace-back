import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Banner } from '@prisma/client';
import * as BannerDTO from './banner.dto';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';
import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BannerService {
  private logger = new Logger('Banner service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<BannerDTO.PageableResponseDto> {
    this.logger.log('getAllBanners by pageable');
    const {
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = getWhereOperations(filter);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id): Promise<BannerDTO.BannerResponse> {
    this.logger.log('bannerById');

    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async create(data: BannerDTO.Create): Promise<BannerDTO.BannerResponse> {
    this.logger.log('createBanner');

    const createdBanner = await this.prisma.banner.create({ data });

    return createdBanner;
  }

  async updateBanner({
    payload,
  }: {
    payload: BannerDTO.Update;
  }): Promise<Banner> {
    this.logger.log('updateBanner');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updateBanner = await this.prisma.banner.update({
      where: { id },
      data,
    });

    return updateBanner;
  }

  async deleteBanner({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteBanner');

    await this.prisma.banner.delete({
      where: { id },
    });

    return true;
  }
}
