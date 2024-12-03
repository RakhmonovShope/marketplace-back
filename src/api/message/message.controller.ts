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
import { MessageService } from './message.service';
import { AuthGuard } from '@nestjs/passport';
import * as MessageDTO from './message.dto';
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
@ApiTags('Messages')
@Controller('messages')
@UseGuards(AuthGuard(), PermissionsGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Message get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [MessageDTO.MessageResponse] })
  @Permissions(PERMISSIONS.MESSAGE__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<MessageDTO.PageableResponseDto> {
    return this.messageService.getAllByPage(params);
  }

  @Get()
  @ApiOperation({ summary: 'Message get all' })
  @ApiBody({ type: [MessageDTO.MessageResponse] })
  @Permissions(PERMISSIONS.MESSAGE__VIEW)
  async getAll(): Promise<MessageDTO.MessageResponse[]> {
    return this.messageService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiBody({ type: MessageDTO.MessageResponse })
  @Permissions(PERMISSIONS.MESSAGE__VIEW)
  async getById(@Param('id') id: string): Promise<MessageDTO.MessageResponse> {
    return this.messageService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create Message' })
  @ApiBody({ type: MessageDTO.Create })
  @Permissions(PERMISSIONS.MESSAGE__CREATE)
  async create(
    @Body() payload: MessageDTO.Create,
  ): Promise<MessageDTO.MessageResponse> {
    return this.messageService.create(payload);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Message' })
  @ApiBody({ type: MessageDTO.Update })
  @Permissions(PERMISSIONS.MESSAGE__UPDATE)
  async update(
    @Param('id') id: string,
    @Body() payload: MessageDTO.Update,
  ): Promise<MessageDTO.MessageResponse> {
    return this.messageService.update({ payload });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Message' })
  @Permissions(PERMISSIONS.MESSAGE__DELETE)
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.messageService.delete({ id });
  }
}
