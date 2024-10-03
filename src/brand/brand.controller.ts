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
import { BrandService } from './brand.service';
import { AuthGuard } from '@nestjs/passport';
import * as BrandDTO from './brand.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Brands')
@Controller('brands')
@UseGuards(AuthGuard(), PermissionsGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOperation({ summary: 'Brand get all' })
  @ApiBody({ type: [BrandDTO.BrandResponse] })
  @Permissions(PERMISSIONS.BRAND__VIEW)
  async getAll(): Promise<BrandDTO.BrandResponse[]> {
    return this.brandService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: BrandDTO.BrandResponse })
  @Permissions(PERMISSIONS.BRAND__VIEW)
  async getAdmin(@Param('id') id: string): Promise<BrandDTO.BrandResponse> {
    return this.brandService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: BrandDTO.Create })
  @Permissions(PERMISSIONS.BRAND__CREATE)
  async create(
    @Body() payload: BrandDTO.Create,
  ): Promise<BrandDTO.BrandResponse> {
    return this.brandService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: BrandDTO.Update })
  @Permissions(PERMISSIONS.BRAND__UPDATE)
  async updateAdmin(
    @Body() payload: BrandDTO.Update,
  ): Promise<BrandDTO.BrandResponse> {
    return this.brandService.updateBrand({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.BRAND__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.brandService.deleteBrand({ id });
  }
}
