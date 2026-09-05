import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { AuthGuard } from '@nestjs/passport';
import * as MessageDTO from './message.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import { ChatGateway } from './chat.gateway';

@ApiBearerAuth()
@ApiTags('Messages')
@Controller('messages')
@UseGuards(AuthGuard(), PermissionsGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Message get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: MessageDTO.PageableResponseDto })
  @Permissions(PERMISSIONS.MESSAGE__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<MessageDTO.PageableResponseDto> {
    return this.messageService.getAllByPage(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: MessageDTO.MessageResponse })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @Permissions(PERMISSIONS.MESSAGE__VIEW)
  async getById(@Param('id') id: string): Promise<MessageDTO.MessageResponse> {
    return this.messageService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Send message (sender = current user)' })
  @ApiBody({ type: MessageDTO.SendMessage })
  @ApiResponse({ status: 201, type: MessageDTO.MessageResponse })
  @Permissions(PERMISSIONS.MESSAGE__CREATE)
  async create(
    @Body() payload: MessageDTO.SendMessage,
    @CurrentUser('id') senderId: string,
  ): Promise<MessageDTO.MessageResponse> {
    const message = await this.messageService.create({ ...payload, senderId });

    // HTTP orqali yuborilgan xabar ham WS mijozlarga real vaqtda yetadi.
    this.chatGateway.emitNewMessage(message);

    return message;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Message' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @Permissions(PERMISSIONS.MESSAGE__DELETE)
  async delete(@Param('id') id: string): Promise<boolean> {
    const message = await this.messageService.getById(id); // 404 bo'lsa shu yerda

    const result = await this.messageService.delete({ id });

    // Faqat ikki tomonga (hammaga emas).
    this.chatGateway.emitMessageDeleted(message);

    return result;
  }
}
