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
import { StoreService } from './store.service';
import { AuthGuard } from '@nestjs/passport';
import * as StoreDTO from './store.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Stores')
@Controller('stores')
@UseGuards(AuthGuard(), PermissionsGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Store get all' })
  @ApiBody({ type: [StoreDTO.StoreResponse] })
  @Permissions(PERMISSIONS.STORE__VIEW)
  async getAll(): Promise<StoreDTO.StoreResponse[]> {
    return this.storeService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: StoreDTO.StoreResponse })
  @Permissions(PERMISSIONS.STORE__VIEW)
  async getAdmin(@Param('id') id: string): Promise<StoreDTO.StoreResponse> {
    return this.storeService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiBody({ type: StoreDTO.StoreResponse })
  @Permissions(PERMISSIONS.STORE__CREATE)
  async create(
    @Body() payload: StoreDTO.Create,
  ): Promise<StoreDTO.StoreResponse> {
    return this.storeService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiBody({ type: StoreDTO.StoreResponse })
  @Permissions(PERMISSIONS.STORE__UPDATE)
  async updateAdmin(
    @Body() payload: StoreDTO.Update,
  ): Promise<StoreDTO.StoreResponse> {
    return this.storeService.updateStore({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.STORE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.storeService.deleteStore({ id });
  }
}
