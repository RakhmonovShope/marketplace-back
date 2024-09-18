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
import { AuthPermission } from '../auth/auth.permission';

@Controller('roles')
@UseGuards(AuthGuard())
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async getAll() {
    return this.roleService.getAll();
  }

  @Get('/permissions')
  async getPermissions() {
    return Object.values(AuthPermission);
  }

  @Get(':id')
  async getAdmin(@Param('id') id: string) {
    return this.roleService.getById({ id });
  }

  @Post()
  async create(@Body() payload: RoleDTO.Create): Promise<Role> {
    return this.roleService.create(payload);
  }

  @Put()
  async updateAdmin(@Body() payload: RoleDTO.Update): Promise<Role> {
    return this.roleService.updateRole({ payload });
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string): Promise<boolean> {
    return this.roleService.deleteRole({ id });
  }
}
