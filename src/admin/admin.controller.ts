import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { User as UserModel } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import * as AdminDTO from './admin.dto';
import { PERMISSIONS } from '../auth/auth.enum';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('admin')
@UseGuards(AuthGuard(), PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Permissions(PERMISSIONS.ADMIN__VIEW)
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ADMIN__VIEW)
  async getById(@Param('id') id: string) {
    return this.adminService.admin(id);
  }

  @Put()
  @Permissions(PERMISSIONS.ADMIN__UPDATE)
  async updateAdmin(@Body() payload: AdminDTO.Update): Promise<UserModel> {
    return this.adminService.updateAdmin(payload);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ADMIN__DELETE)
  async deleteAdmin(@Param('id') id: string): Promise<UserModel> {
    return this.adminService.deleteAdmin(id);
  }
}
