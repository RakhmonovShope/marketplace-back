import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Page } from '@prisma/client';
import * as PageDTO from './page.dto';
import { PageableResponseDto } from './page.dto';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';
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
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = getWhereOperations(filter);

    const [pages, totalItems] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data: pages,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id): Promise<PageDTO.PageResponse> {
    this.logger.log('pageById');

    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async create(data: PageDTO.Create): Promise<PageDTO.PageResponse> {
    this.logger.log('createPage');

    const createdPage = await this.prisma.page.create({ data });

    return createdPage;
  }

  async updatePage({ payload }: { payload: PageDTO.Update }): Promise<Page> {
    this.logger.log('updatePage');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updatePage = await this.prisma.page.update({
      where: { id },
      data,
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
