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
  ApiParam,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: BadgeDTO.BadgeResponse })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Permissions(PERMISSIONS.BADGE__VIEW)
  async getAdmin(@Param('id') id: string): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: BadgeDTO.Create })
  @ApiResponse({ status: 201, type: BadgeDTO.BadgeResponse })
  @Permissions(PERMISSIONS.BADGE__CREATE)
  async create(
    @Body() payload: BadgeDTO.Create,
  ): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: BadgeDTO.Update })
  @ApiResponse({ status: 200, type: BadgeDTO.BadgeResponse })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Permissions(PERMISSIONS.BADGE__UPDATE)
  async updateAdmin(
    @Body() payload: BadgeDTO.Update,
  ): Promise<BadgeDTO.BadgeResponse> {
    return this.badgeService.updateBadge({ payload });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete badge' })
  @Permissions(PERMISSIONS.BADGE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.badgeService.deleteBadge({ id });
  }
}
