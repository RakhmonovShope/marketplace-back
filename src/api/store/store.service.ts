import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Store } from '@prisma/client';
import * as StoreDTO from './store.dto';
import { PaginationFilterOrderRequest } from 'common/common.dto';

import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StoreService {
  private logger = new Logger('Store service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<StoreDTO.PageableResponseDto> {
    this.logger.log('getAllStores by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const where = { ...getWhereOperations(filter), deletedAt: null };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: order ? order.toLowerCase() : 'asc',
        },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id): Promise<StoreDTO.StoreResponse> {
    this.logger.log('pageById');

    const store = await this.prisma.store.findFirst({
      where: { id, deletedAt: null },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async create(data: StoreDTO.Create): Promise<StoreDTO.StoreResponse> {
    this.logger.log('createStore');

    const createdStore = await this.prisma.store.create({ data });

    return createdStore;
  }

  async updateStore({ payload }: { payload: StoreDTO.Update }): Promise<Store> {
    this.logger.log('updateStore');

    const updateStore = await this.prisma.store.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateStore;
  }

  async deleteStore({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteStore');

    const { count } = await this.prisma.store.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('Store not found or already deleted');
    }

    return true;
  }

  async restoreStore({ id }: { id: string }): Promise<Store> {
    this.logger.log('restoreStore');

    const { count } = await this.prisma.store.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    if (count === 0) {
      throw new NotFoundException('Deleted store not found');
    }

    return this.prisma.store.findUniqueOrThrow({ where: { id } });
  }
}
