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
import { BannerService } from './banner.service';
import { AuthGuard } from '@nestjs/passport';
import * as BannerDTO from './banner.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationFilterOrderRequest } from 'common/common.dto';

@ApiBearerAuth()
@ApiTags('Banners')
@Controller('banners')
@UseGuards(AuthGuard(), PermissionsGuard)
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Banner get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [BannerDTO.BannerResponse] })
  @Permissions(PERMISSIONS.BANNER__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<BannerDTO.PageableResponseDto> {
    return this.bannerService.getAllByPage(params);
  }

  @Get()
  @ApiOperation({ summary: 'Banner get all' })
  @ApiBody({ type: [BannerDTO.BannerResponse] })
  @Permissions(PERMISSIONS.BANNER__VIEW)
  async getAll(): Promise<BannerDTO.BannerResponse[]> {
    return this.bannerService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: BannerDTO.BannerResponse })
  @Permissions(PERMISSIONS.BANNER__VIEW)
  async getAdmin(@Param('id') id: string): Promise<BannerDTO.BannerResponse> {
    return this.bannerService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: BannerDTO.BannerResponse })
  @Permissions(PERMISSIONS.BANNER__CREATE)
  async create(
    @Body() payload: BannerDTO.Create,
  ): Promise<BannerDTO.BannerResponse> {
    return this.bannerService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: BannerDTO.BannerResponse })
  @Permissions(PERMISSIONS.BANNER__UPDATE)
  async updateAdmin(
    @Body() payload: BannerDTO.Update,
  ): Promise<BannerDTO.BannerResponse> {
    return this.bannerService.updateBanner({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.BANNER__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.bannerService.deleteBanner({ id });
  }
}
