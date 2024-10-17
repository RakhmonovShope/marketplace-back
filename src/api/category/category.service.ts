import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as CategoryDTO from './category.dto';
import { PaginationFilterOrderRequest } from '../../common/common.dto';
import { getWhereOperations } from 'helpers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CategoryService {
  private logger = new Logger('Category service');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<CategoryDTO.PageableResponseDto> {
    this.logger.log('getAllCategories by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const items = await this.prisma.category.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.category.count();

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<CategoryDTO.CategoryResponse[]> {
    this.logger.log('getAllCategorys');
    const categorys = await this.prisma.category.findMany();

    return categorys;
  }

  async getById(id: string): Promise<CategoryDTO.CategoryResponse> {
    this.logger.log('categoryById');

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    return category;
  }

  async create(
    data: CategoryDTO.Create,
  ): Promise<CategoryDTO.CategoryResponse> {
    this.logger.log('createCategory');

    const createdCategory = await this.prisma.category.create({ data });

    return createdCategory;
  }

  async updateCategory({
    payload,
  }: {
    payload: CategoryDTO.Update;
  }): Promise<CategoryDTO.CategoryResponse> {
    this.logger.log('updateCategory');

    const updateCategory = await this.prisma.category.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateCategory;
  }

  async deleteCategory({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteCategory');

    await this.prisma.category.delete({
      where: { id },
    });

    return true;
  }
}
