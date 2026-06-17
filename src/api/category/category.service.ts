import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

    const where = { ...getWhereOperations(filter), deletedAt: null };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: order ? order.toLowerCase() : 'asc',
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id: string): Promise<CategoryDTO.CategoryResponse> {
    this.logger.log('categoryById');

    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

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

    const { count } = await this.prisma.category.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('Category not found or already deleted');
    }

    return true;
  }

  async restoreCategory({
    id,
  }: {
    id: string;
  }): Promise<CategoryDTO.CategoryResponse> {
    this.logger.log('restoreCategory');

    const { count } = await this.prisma.category.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    if (count === 0) {
      throw new NotFoundException('Deleted category not found');
    }

    return this.prisma.category.findUniqueOrThrow({ where: { id } });
  }
}
