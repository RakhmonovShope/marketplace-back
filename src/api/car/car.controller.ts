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

  @Get()
  @ApiOperation({ summary: 'Car get all' })
  @ApiBody({ type: [CarDTO.CarResponse] })
  @Permissions(PERMISSIONS.CAR__VIEW)
  async getAll(): Promise<CarDTO.CarResponse[]> {
    return this.carService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: CarDTO.CarResponse })
  @Permissions(PERMISSIONS.CAR__VIEW)
  async getById(@Param('id') id: string): Promise<CarDTO.CarResponse> {
    return this.carService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create Car' })
  @ApiBody({ type: CarDTO.Create })
  @Permissions(PERMISSIONS.CAR__CREATE)
  async create(@Body() payload: CarDTO.CreateCar): Promise<CarDTO.CarResponse> {
    return this.carService.create(payload);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Car' })
  @ApiBody({ type: CarDTO.UpdateCar })
  @Permissions(PERMISSIONS.CAR__UPDATE)
  async update(
    @Param('id') id: string,
    @Body() payload: CarDTO.Update,
  ): Promise<CarDTO.CarResponse> {
    return this.carService.update({ payload });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Car' })
  @Permissions(PERMISSIONS.CAR__DELETE)
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.carService.delete({ id });
  }
}
