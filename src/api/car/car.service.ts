import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

    const where = getWhereOperations(filter);

    const [cars, totalItems] = await this.prisma.$transaction([
      this.prisma.car.findMany({
        where: { ...where, deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: order ? order.toLowerCase() : 'asc',
        },
      }),
      this.prisma.car.count({ where: { ...where, deletedAt: null } }),
    ]);

    return {
      data: cars,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id: string): Promise<CarDTO.CarResponse> {
    this.logger.log('carById');

    const car = await this.prisma.car.findFirst({
      where: { id, deletedAt: null },
    });

    return car;
  }

  async create(data: CarDTO.Create): Promise<CarDTO.CarResponse> {
    this.logger.log('createCar');

    const createdCar = await this.prisma.car.create({ data });

    return createdCar;
  }

  async update({ payload }: { payload: CarDTO.Update }): Promise<Car> {
    this.logger.log('updateCar');

    const updateCar = await this.prisma.car.update({
      where: { id: payload.id },
      data: payload,
    });

    return updateCar;
  }

  async delete({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteCar');

    // Faqat hali tirik (deletedAt: null) mashinani soft-delete qilamiz.
    // updateMany count=0 qaytarsa — mashina yo'q yoki allaqachon o'chirilgan.
    const { count } = await this.prisma.car.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('Car not found or already deleted');
    }

    return true;
  }

  async restore({ id }: { id: string }): Promise<Car> {
    this.logger.log('restoreCar');

    // Faqat o'chirilgan (deletedAt != null) mashinani tiklaymiz.
    const { count } = await this.prisma.car.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null }, // belgini olib tashlaymiz → yana tirik
    });

    if (count === 0) {
      throw new NotFoundException('Deleted car not found');
    }

    return this.prisma.car.findUniqueOrThrow({ where: { id } });
  }
}
