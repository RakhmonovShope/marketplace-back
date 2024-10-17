import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Page } from '@prisma/client';
import * as PageDTO from './page.dto';
import { PageableResponseDto } from './page.dto';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PageService {
  private logger = new Logger('Page service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<PageableResponseDto> {
    this.logger.log('getAllPages by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const pages = await this.prisma.page.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.page.count();

    return {
      data: pages,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<PageDTO.PageResponse[]> {
    this.logger.log('getAllPages');
    const pages = await this.prisma.page.findMany();

    return pages;
  }

  async getById(id): Promise<PageDTO.PageResponse> {
    this.logger.log('pageById');

    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    return page;
  }

  async create(data: PageDTO.Create): Promise<PageDTO.PageResponse> {
    this.logger.log('createPage');

    const createdPage = await this.prisma.page.create({ data });

    return createdPage;
  }

  async updatePage({ payload }: { payload: PageDTO.Update }): Promise<Page> {
    this.logger.log('updatePage');

    const updatePage = await this.prisma.page.update({
      where: { id: payload.id },
      data: payload,
    });

    return updatePage;
  }

  async deletePage({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deletePage');

    await this.prisma.page.delete({
      where: { id },
    });

    return true;
  }
}
