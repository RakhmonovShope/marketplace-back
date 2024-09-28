import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { AuthGuard } from '@nestjs/passport';
import * as CategoryDTO from './category.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Category')
@Controller('category')
@UseGuards(AuthGuard(), PermissionsGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Category get all' })
  @ApiBody({ type: [CategoryDTO.CategoryResponse] })
  @Permissions(PERMISSIONS.CATEGORY__VIEW)
  async getAll() {
    return this.categoryService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Category get by Id' })
  @ApiBody({ type: CategoryDTO.CategoryResponse })
  @Permissions(PERMISSIONS.CATEGORY__VIEW)
  async getById(@Param('id') id: string) {
    return this.categoryService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Category create' })
  @ApiBody({ type: CategoryDTO.CategoryResponse })
  @Permissions(PERMISSIONS.CATEGORY__CREATE)
  async create(
    @Body() payload: CategoryDTO.Create,
  ): Promise<CategoryDTO.CategoryResponse> {
    return this.categoryService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Category update' })
  @ApiBody({ type: CategoryDTO.CategoryResponse })
  @Permissions(PERMISSIONS.CATEGORY__UPDATE)
  async updateAdmin(
    @Body() payload: CategoryDTO.Update,
  ): Promise<CategoryDTO.CategoryResponse> {
    return this.categoryService.updateCategory({ payload });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Category delete' })
  @Permissions(PERMISSIONS.CATEGORY__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.categoryService.deleteCategory({ id });
  }
}
