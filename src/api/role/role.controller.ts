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
import { RoleService } from './role.service';
import { AuthGuard } from '@nestjs/passport';
import * as RoleDTO from './role.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PaginationFilterOrderRequest } from 'common/common.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';

@ApiBearerAuth()
@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard(), PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('/pageable')
  @ApiOperation({ summary: 'Role get all by page' })
  @ApiBody({ type: PaginationFilterOrderRequest })
  @ApiResponse({ type: [RoleDTO.RoleResponse] })
  @Permissions(PERMISSIONS.ROLE__VIEW)
  async getAllByPage(
    @Body() params: PaginationFilterOrderRequest,
  ): Promise<RoleDTO.PageableResponseDto> {
    return this.roleService.getAllByPage(params);
  }

  @Get()
  @ApiOperation({ summary: 'Role get all' })
  @ApiResponse({ type: [RoleDTO.RoleResponse] })
  @Permissions(PERMISSIONS.ROLE__VIEW)
  async getAll(): Promise<RoleDTO.RoleResponse[]> {
    return this.roleService.getAll();
  }

  @Get('/permissions')
  @ApiOperation({ summary: 'Permissions' })
  @ApiResponse({ type: PickType<RoleDTO.RoleResponse, 'permissions'> })
  @Permissions(PERMISSIONS.ROLE__PERMISSION__VIEW)
  async getPermissions() {
    return Object.values(PERMISSIONS);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get By Id' })
  @ApiResponse({ type: RoleDTO.RoleResponse })
  @Permissions(PERMISSIONS.ROLE__VIEW)
  async getAdmin(@Param('id') id: string): Promise<RoleDTO.RoleResponse> {
    return this.roleService.getById({ id });
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  @ApiResponse({ type: RoleDTO.RoleResponse })
  @Permissions(PERMISSIONS.ROLE__CREATE)
  async create(@Body() payload: RoleDTO.Create): Promise<RoleDTO.RoleResponse> {
    return this.roleService.create(payload);
  }

  @Put()
  @ApiOperation({ summary: 'Update' })
  @ApiResponse({ type: RoleDTO.RoleResponse })
  @Permissions(PERMISSIONS.ROLE__UPDATE)
  async updateAdmin(
    @Body() payload: RoleDTO.Update,
  ): Promise<RoleDTO.RoleResponse> {
    return this.roleService.updateRole({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.roleService.deleteRole({ id });
  }
}
