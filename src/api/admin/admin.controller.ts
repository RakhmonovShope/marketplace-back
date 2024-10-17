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
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import * as AdminDTO from './admin.dto';
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

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard(), PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Admin get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [AdminDTO.UserResponseDto] })
  @Permissions(PERMISSIONS.ADMIN__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<AdminDTO.PageableResponseDto> {
    return this.adminService.getAllByPage(params);
  }

  @ApiOperation({ summary: 'Admin get all' })
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Admins',
    type: [AdminDTO.UserResponseDto],
  })
  @Permissions(PERMISSIONS.ADMIN__VIEW)
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @ApiOperation({ summary: 'Admin by ID' })
  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Admin',
    type: AdminDTO.UserResponseDto,
  })
  @Permissions(PERMISSIONS.ADMIN__VIEW)
  async getById(@Param('id') id: string) {
    return this.adminService.admin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Admin create' })
  @ApiResponse({
    status: 200,
    description: 'Admin',
    type: AdminDTO.UserResponseDto,
  })
  @Permissions(PERMISSIONS.ADMIN__UPDATE)
  async createAdmin(
    @Body() payload: AdminDTO.Create,
  ): Promise<AdminDTO.UserResponseDto> {
    return this.adminService.createAdmin(payload);
  }

  @Put()
  @ApiResponse({
    status: 200,
    description: 'Admin',
    type: AdminDTO.UserResponseDto,
  })
  @ApiOperation({ summary: 'Admin update' })
  @Permissions(PERMISSIONS.ADMIN__UPDATE)
  async updateAdmin(
    @Body() payload: AdminDTO.Update,
  ): Promise<AdminDTO.UserResponseDto> {
    return this.adminService.updateAdmin(payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin delete' })
  @Permissions(PERMISSIONS.ADMIN__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<string> {
    return this.adminService.deleteAdmin(id);
  }
}
