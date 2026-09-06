import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';
import * as MessageDTO from './message.dto';
import { getWhereOperations } from 'helpers';
import { PaginationFilterOrderRequest, toPrismaOrder } from 'common/common.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MessageService {
  private logger = new Logger('MessageService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAllByPage(
    params: PaginationFilterOrderRequest,
  ): Promise<MessageDTO.PageableResponseDto> {
    this.logger.log('getAllMessages by pageable');
    const {
      perPage = this.config.get<number>('PAGE_SIZE', 20),
      page,
      order,
      filter,
    } = params;

    const where = getWhereOperations(filter);

    const [messages, totalItems] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: {
          createdAt: toPrismaOrder(order),
        },
      }),
      this.prisma.message.count({ where }), // filter bilan — totalPages to'g'ri bo'lsin
    ]);

    return {
      data: messages,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getById(id: string): Promise<MessageDTO.MessageResponse> {
    this.logger.log('messageById');

    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async create(
    data: MessageDTO.CreateMessage,
  ): Promise<MessageDTO.MessageResponse> {
    this.logger.log('createMessage');

    const createdMessage = await this.prisma.message.create({ data });

    return createdMessage;
  }

  async update({
    payload,
  }: {
    payload: MessageDTO.UpdateMessage;
  }): Promise<Message> {
    this.logger.log('updateMessage');

    // `id` `data` ga kirmasin (primary key yangilanmaydi).
    const { id, ...data } = payload;

    const updateMessage = await this.prisma.message.update({
      where: { id },
      data,
    });

    return updateMessage;
  }

  async delete({ id }: { id: string }): Promise<boolean> {
    this.logger.log('deleteMessage');

    await this.prisma.message.delete({
      where: { id },
    });

    return true;
  }
}
