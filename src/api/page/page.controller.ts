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
import { PageService } from './page.service';
import { AuthGuard } from '@nestjs/passport';
import * as PageDTO from './page.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Pages')
@Controller('pages')
@UseGuards(AuthGuard(), PermissionsGuard)
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  @ApiOperation({ summary: 'Page get all' })
  @ApiBody({ type: [PageDTO.PageResponse] })
  @Permissions(PERMISSIONS.PAGE__VIEW)
  async getAll(): Promise<PageDTO.PageResponse[]> {
    return this.pageService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: PageDTO.PageResponse })
  @Permissions(PERMISSIONS.PAGE__VIEW)
  async getAdmin(@Param('id') id: string): Promise<PageDTO.PageResponse> {
    return this.pageService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: PageDTO.PageResponse })
  @Permissions(PERMISSIONS.PAGE__CREATE)
  async create(@Body() payload: PageDTO.Create): Promise<PageDTO.PageResponse> {
    return this.pageService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: PageDTO.PageResponse })
  @Permissions(PERMISSIONS.PAGE__UPDATE)
  async updateAdmin(
    @Body() payload: PageDTO.Update,
  ): Promise<PageDTO.PageResponse> {
    return this.pageService.updatePage({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PAGE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.pageService.deletePage({ id });
  }
}
