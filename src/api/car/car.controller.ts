import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CarService } from './car.service';
import { AuthGuard } from '@nestjs/passport';
import * as CarDTO from './car.dto';
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
@ApiTags('Cars')
@Controller('cars')
@UseGuards(AuthGuard(), PermissionsGuard)
export class CarController {
  constructor(private readonly carService: CarService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Car get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [CarDTO.CarResponse] })
  @Permissions(PERMISSIONS.CAR__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<CarDTO.PageableResponseDto> {
    return this.carService.getAllByPage(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: CarDTO.CarResponse })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Permissions(PERMISSIONS.CAR__VIEW)
  async getById(@Param('id') id: string): Promise<CarDTO.CarResponse> {
    return this.carService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create Car' })
  @ApiBody({ type: CarDTO.Create })
  @Permissions(PERMISSIONS.CAR__CREATE)
  async create(@Body() payload: CarDTO.Create): Promise<CarDTO.CarResponse> {
    return this.carService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update Car' })
  @ApiBody({ type: CarDTO.Update })
  @Permissions(PERMISSIONS.CAR__UPDATE)
  async update(@Body() payload: CarDTO.Update): Promise<CarDTO.CarResponse> {
    return this.carService.update({ payload });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Car' })
  @Permissions(PERMISSIONS.CAR__DELETE)
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.carService.delete({ id });
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore soft-deleted Car' })
  @Permissions(PERMISSIONS.CAR__RESTORE)
  async restore(@Param('id') id: string): Promise<CarDTO.CarResponse> {
    return this.carService.restore({ id });
  }
}
