import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User as UserModel } from '@prisma/client';
import * as AuthDTO from './auth.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as AdminDTO from '../admin/admin.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (Sign In)' })
  @ApiResponse({ status: 200, type: AuthDTO.TokensResponseDto })
  @Throttle({ short: { limit: 5, ttl: 10_000 } })
  async signIn(
    @Body() userData: AuthDTO.SignIn,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ): Promise<AuthDTO.TokensResponseDto> {
    return this.authService.signIn(userData, { userAgent, ipAddress });
  }

  @Post('signup')
  @ApiOperation({ summary: 'Registration (Sign Up)' })
  @ApiResponse({ status: 201, type: AdminDTO.UserResponseDto })
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  async signUp(@Body() userData: AuthDTO.SignUp): Promise<UserModel> {
    return this.authService.signUp(userData);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ type: AuthDTO.TokensResponseDto })
  async refresh(
    @Body() body: AuthDTO.RefreshTokenDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ): Promise<AuthDTO.TokensResponseDto> {
    return this.authService.refresh(body.refreshToken, {
      userAgent,
      ipAddress,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async logout(
    @Body() body: AuthDTO.RefreshTokenDto,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async logoutAll(@Req() req: RequestWithUser): Promise<{ success: boolean }> {
    return this.authService.logoutAll(req.user.id);
  }

  @Get('get-me')
  @ApiOperation({ summary: 'Get me' })
  @ApiResponse({
    status: 200,
    description: 'User',
    type: AdminDTO.UserResponseDto,
  })
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token is missing or invalid');
    }

    const accessToken = authHeader.split(' ')[1];

    return this.authService.getMe(accessToken);
  }

  // ===== Email verification + reset password =====

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email by token' })
  @ApiResponse({ status: 200, type: AuthDTO.MessageResponseDto })
  @Throttle({ medium: { limit: 10, ttl: 10_000 } })
  async verifyEmail(
    @Body() body: AuthDTO.VerifyEmailDto,
  ): Promise<AuthDTO.MessageResponseDto> {
    await this.authService.verifyEmail(body.token);
    return { success: true, message: 'Email verified' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, type: AuthDTO.MessageResponseDto })
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  async resendVerification(
    @Body() body: AuthDTO.ResendVerificationDto,
  ): Promise<AuthDTO.MessageResponseDto> {
    await this.authService.resendVerification(body.email);
    return {
      success: true,
      message: 'If the email exists, verification has been sent',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, type: AuthDTO.MessageResponseDto })
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  async forgotPassword(
    @Body() body: AuthDTO.ForgotPasswordDto,
  ): Promise<AuthDTO.MessageResponseDto> {
    await this.authService.forgotPassword(body.email);
    return {
      success: true,
      message: 'If the email exists, reset instructions have been sent',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using emailed token' })
  @ApiResponse({ status: 200, type: AuthDTO.MessageResponseDto })
  @Throttle({ medium: { limit: 10, ttl: 10_000 } })
  async resetPassword(
    @Body() body: AuthDTO.ResetPasswordDto,
  ): Promise<AuthDTO.MessageResponseDto> {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { success: true, message: 'Password has been reset' };
  }
}
