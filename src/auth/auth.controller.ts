import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User as UserModel } from '@prisma/client';
import * as AuthDTO from './auth.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
