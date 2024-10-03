import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Brand } from '@prisma/client';
import * as BrandDTO from './brand.dto';

@Injectable()
export class BrandService {
  private logger = new Logger('Brand service');

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<BrandDTO.BrandResponse[]> {
    this.logger.log('getAllBrands');
    const pages = await this.prisma.store.findMany();

    return pages;
  }

  async getById(id): Promise<BrandDTO.BrandResponse> {
    this.logger.log('pageById');

    const page = await this.prisma.store.findUnique({
      where: { id },
    });

    return page;
  }

  async create(data: BrandDTO.Create): Promise<BrandDTO.BrandResponse> {
    this.logger.log('createBrand');

    const createdBrand = await this.prisma.store.create({ data });

    return createdBrand;
  }

  async updateBrand({ payload }: { payload: BrandDTO.Update }): Promise<Brand> {
    this.logger.log('updateBrand');

    const updateBrand = await this.prisma.store.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateBrand;
  }

  async deleteBrand({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteBrand');

    await this.prisma.store.delete({
      where: { id },
    });

    return true;
  }
}
