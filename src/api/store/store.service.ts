import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Store } from '@prisma/client';
import * as StoreDTO from './store.dto';

@Injectable()
export class StoreService {
  private logger = new Logger('Store service');

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<StoreDTO.StoreResponse[]> {
    this.logger.log('getAllStores');
    const pages = await this.prisma.store.findMany();

    return pages;
  }

  async getById(id): Promise<StoreDTO.StoreResponse> {
    this.logger.log('pageById');

    const page = await this.prisma.store.findUnique({
      where: { id },
    });

    return page;
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

    await this.prisma.store.delete({
      where: { id },
    });

    return true;
  }
}
