import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Banner } from '@prisma/client';
import * as BannerDTO from './banner.dto';
import { PaginationFilterOrderRequest } from 'common/common.dto';
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
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const items = await this.prisma.banner.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.banner.count();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<BannerDTO.BannerResponse[]> {
    this.logger.log('getAllBanners');
    const banners = await this.prisma.banner.findMany();

    return banners;
  }

  async getById(id): Promise<BannerDTO.BannerResponse> {
    this.logger.log('bannerById');

    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

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

    const updateBanner = await this.prisma.banner.update({
      where: { id: payload.id },
      data: payload,
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
