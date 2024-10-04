import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Banner } from '@prisma/client';
import * as BannerDTO from './banner.dto';

@Injectable()
export class BannerService {
  private logger = new Logger('Banner service');

  constructor(private readonly prisma: PrismaService) {}

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
