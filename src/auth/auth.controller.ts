import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User as UserModel } from '@prisma/client';
import * as AuthDTO from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signIn(
    @Body() userData: AuthDTO.SignIn,
  ): Promise<{ accessToken: string }> {
    return this.authService.signIn(userData);
  }

  @Post('signup')
  async signUp(@Body() userData: AuthDTO.SignUp): Promise<UserModel> {
    return this.authService.signUp(userData);
  }
}
