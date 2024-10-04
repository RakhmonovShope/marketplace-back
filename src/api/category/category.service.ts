import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as CategoryDTO from './category.dto';

@Injectable()
export class CategoryService {
  private logger = new Logger('Category service');

  constructor(private readonly prisma: PrismaService) {}

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
