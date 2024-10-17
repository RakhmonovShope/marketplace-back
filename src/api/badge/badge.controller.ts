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
import { BadgeService } from './badge.service';
import { AuthGuard } from '@nestjs/passport';
import * as BadgeDTO from './badge.dto';
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
@ApiTags('Badges')
@Controller('badges')
@UseGuards(AuthGuard(), PermissionsGuard)
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Badge get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [BadgeDTO.BadgeResponse] })
  @Permissions(PERMISSIONS.BADGE__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<BadgeDTO.PageableResponseDto> {
    return this.badgeService.getAllByPage(params);
  }

  @Get()
  @ApiOperation({ summary: 'Badge get all' })
  @ApiBody({ type: [BadgeDTO.BadgeResponse] })
  @Permissions(PERMISSIONS.BADGE__VIEW)
  async getAll(): Promise<BadgeDTO.BadgeResponse[]> {
    return this.badgeService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: BadgeDTO.BadgeResponse })
  @Permissions(PERMISSIONS.BADGE__VIEW)
  async getAdmin(@Param('id') id: string): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: BadgeDTO.BadgeResponse })
  @Permissions(PERMISSIONS.BADGE__CREATE)
  async create(
    @Body() payload: BadgeDTO.Create,
  ): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: BadgeDTO.BadgeResponse })
  @Permissions(PERMISSIONS.BADGE__UPDATE)
  async updateAdmin(
    @Body() payload: BadgeDTO.Update,
  ): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.updateBadge({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.BADGE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.badgeService.deleteBadge({ id });
  }
}
