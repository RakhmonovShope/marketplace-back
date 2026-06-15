import { Injectable, Logger } from '@nestjs/common';
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

    const where = getWhereOperations(filter);

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

    const page = await this.prisma.brand.findUnique({
      where: { id },
    });

    return page;
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

    await this.prisma.brand.delete({
      where: { id },
    });

    return true;
  }
}
