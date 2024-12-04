import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User as UserModel } from '@prisma/client';
import * as AuthDTO from './auth.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as AdminDTO from '../admin/admin.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @ApiOperation({ summary: 'Login (Sign In)' })
  async signIn(
    @Body() userData: AuthDTO.SignIn,
  ): Promise<{ accessToken: string }> {
    return this.authService.signIn(userData);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Registration (Sign Up)' })
  async signUp(@Body() userData: AuthDTO.SignUp): Promise<UserModel> {
    return this.authService.signUp(userData);
  }

  @ApiOperation({ summary: 'Get me' })
  @ApiResponse({
    status: 200,
    description: 'User',
    type: AdminDTO.UserResponseDto,
  })
  @Get('get-me')
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token is missing or invalid');
    }

    const accessToken = authHeader.split(' ')[1];

    return this.authService.getMe(accessToken);
  }
}
