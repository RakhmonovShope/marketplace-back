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
import { Prisma, User as UserModel } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
@UseGuards(AuthGuard())
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.adminService.admin({ id });
  }

  @Put(':id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() adminData: Prisma.UserUpdateInput,
  ): Promise<UserModel> {
    return this.adminService.updateAdmin({
      where: { id },
      data: adminData,
    });
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string): Promise<UserModel> {
    return this.adminService.deleteAdmin({ id: id });
  }
}
