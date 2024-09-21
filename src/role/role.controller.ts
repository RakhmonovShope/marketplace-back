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
import { Role } from '@prisma/client';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('roles')
@UseGuards(AuthGuard(), PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Permissions(PERMISSIONS.ROLE__VIEW)
  async getAll() {
    return this.roleService.getAll();
  }

  @Get('/permissions')
  @Permissions(PERMISSIONS.ROLE__PERMISSION__VIEW)
  async getPermissions() {
    return Object.values(PERMISSIONS);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ROLE__VIEW)
  async getAdmin(@Param('id') id: string) {
    return this.roleService.getById({ id });
  }

  @Post()
  @Permissions(PERMISSIONS.ROLE__CREATE)
  async create(@Body() payload: RoleDTO.Create): Promise<Role> {
    return this.roleService.create(payload);
  }

  @Put()
  @Permissions(PERMISSIONS.ROLE__UPDATE)
  async updateAdmin(@Body() payload: RoleDTO.Update): Promise<Role> {
    return this.roleService.updateRole({ payload });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLE__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.roleService.deleteRole({ id });
  }
}
