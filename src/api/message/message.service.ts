import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';
import * as MessageDTO from './message.dto';
import { getWhereOperations } from 'helpers';
import { PaginationFilterOrderRequest } from 'common/common.dto';
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
      perPage = Number(this.config.get('PAGE_SIZE')),
      page,
      order,
      filter,
    } = params;

    const messages = await this.prisma.message.findMany({
      where: getWhereOperations(filter),
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: {
        createdAt: order ? order.toLowerCase() : 'asc',
      },
    });

    const totalItems = await this.prisma.message.count();

    return {
      data: messages,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      currentPage: page,
    };
  }

  async getAll({
    receiverId,
    senderId,
  }: {
    senderId: string;
    receiverId: string;
  }): Promise<MessageDTO.MessageResponse[]> {
    this.logger.log('getAllMessages');

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          {
            senderId,
            receiverId,
          },
          {
            senderId: receiverId,
            receiverId: senderId,
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  async getById(id: string): Promise<MessageDTO.MessageResponse> {
    this.logger.log('messageById');

    const message = await this.prisma.message.findUnique({
      where: { id },
    });

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

    const updateMessage = await this.prisma.message.update({
      where: { id: payload.id },
      data: payload,
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
