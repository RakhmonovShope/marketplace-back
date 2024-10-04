import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Page } from '@prisma/client';
import * as PageDTO from './page.dto';

@Injectable()
export class PageService {
  private logger = new Logger('Page service');

  constructor(private readonly prisma: PrismaService) {}

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
