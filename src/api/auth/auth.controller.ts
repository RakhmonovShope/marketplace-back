import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (Sign In)' })
  @ApiResponse({ status: 200, type: AuthDTO.TokensResponseDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force: 5 urinish / daqiqa / IP
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
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } }) // 3 ta / soat / IP
  async signUp(
    @Body() userData: AuthDTO.SignUp,
  ): Promise<AdminDTO.UserResponseDto> {
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
  async logoutAll(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.authService.logoutAll(userId);
  }

  // Token tekshiruvi — JwtStrategy (imzo + sessiya), qo'lda emas. `/get-me` — eski alias.
  @Get(['me', 'get-me'])
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Current user (alias: /get-me)' })
  @ApiResponse({
    status: 200,
    description: 'User',
    type: AdminDTO.UserResponseDto,
  })
  async getMe(
    @CurrentUser('id') userId: string,
  ): Promise<AdminDTO.UserResponseDto> {
    return this.authService.getMe(userId);
  }

  // ===== Email verification + reset password =====

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email by token' })
  @ApiResponse({ status: 200, type: AuthDTO.MessageResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // token brute-force: 10 / daqiqa / IP
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
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } }) // 3 ta / soat / IP
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
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } }) // 3 ta / soat / IP
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // token brute-force: 10 / daqiqa / IP
  async resetPassword(
    @Body() body: AuthDTO.ResetPasswordDto,
  ): Promise<AuthDTO.MessageResponseDto> {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { success: true, message: 'Password has been reset' };
  }
}
