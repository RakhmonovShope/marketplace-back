import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Car } from '@prisma/client';
import * as CarDTO from './car.dto';
import { getWhereOperations } from 'helpers';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CarService {
  private logger = new Logger('CarService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<CarDTO.PageableResponseDto> {
    this.logger.log('getAllCars by pageable');
    const {
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const cars = await this.prisma.car.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.car.count();

    return {
      data: cars,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll(): Promise<CarDTO.CarResponse[]> {
    this.logger.log('getAllCars');

    const cars = await this.prisma.car.findMany();

    return cars;
  }

  async getById(id: string): Promise<CarDTO.CarResponse> {
    this.logger.log('carById');

    const car = await this.prisma.car.findUnique({
      where: { id },
    });

    return car;
  }

  async create(data: CarDTO.CreateCar): Promise<CarDTO.CarResponse> {
    this.logger.log('createCar');

    const createdCar = await this.prisma.car.create({ data });

    return createdCar;
  }

  async update({ payload }: { payload: CarDTO.UpdateCar }): Promise<Car> {
    this.logger.log('updateCar');

    const updateCar = await this.prisma.car.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateCar;
  }

  async delete({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteCar');

    await this.prisma.car.delete({
      where: { id },
    });

    return true;
  }
}
