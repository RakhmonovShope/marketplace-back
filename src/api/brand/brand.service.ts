import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Brand } from '@prisma/client';
import * as BrandDTO from './brand.dto';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrandService {
  private logger = new Logger('Brand service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<BrandDTO.PageableResponseDto> {
    this.logger.log('getAllBrands by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const where = { ...getWhereOperations(filter), deletedAt: null };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: order ? order.toLowerCase() : 'asc',
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id): Promise<BrandDTO.BrandResponse> {
    this.logger.log('pageById');

    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async create(data: BrandDTO.Create): Promise<BrandDTO.BrandResponse> {
    this.logger.log('createBrand');

    const createdBrand = await this.prisma.brand.create({ data });

    return createdBrand;
  }

  async updateBrand({ payload }: { payload: BrandDTO.Update }): Promise<Brand> {
    this.logger.log('updateBrand');

    const updateBrand = await this.prisma.brand.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateBrand;
  }

  async deleteBrand({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteBrand');

    const { count } = await this.prisma.brand.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('Brand not found or already deleted');
    }

    return true;
  }

  async restoreBrand({ id }: { id: string }): Promise<Brand> {
    this.logger.log('restoreBrand');

    const { count } = await this.prisma.brand.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    if (count === 0) {
      throw new NotFoundException('Deleted brand not found');
    }

    return this.prisma.brand.findUniqueOrThrow({ where: { id } });
  }
}
