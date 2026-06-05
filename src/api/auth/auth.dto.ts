import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { GENDER, SUB_TYPE } from '@prisma/client';

export class SignUp {
  @ApiProperty({ description: 'phone' })
  @IsString()
  @Length(12)
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'firstName' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'lastName' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'gender', enum: GENDER })
  @IsEnum(GENDER)
  @IsNotEmpty()
  gender: GENDER;

  @ApiProperty({ description: `birthday` })
  @IsString()
  birthday: string;

  @ApiProperty({ description: `SubType`, enum: SUB_TYPE })
  @IsEnum(SUB_TYPE)
  @IsNotEmpty()
  subType: SUB_TYPE;

  @ApiProperty({ description: `active` })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: `password` })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: `roleId` })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class SignIn {
  @ApiProperty({ description: `phone` })
  @IsString()
  @IsNotEmpty()
  @Length(12)
  phone: string;

  @ApiProperty({ description: `password` })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class TokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

// ===== Email verification + reset password =====

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email orqali kelgan xom token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ description: 'Email manzili' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email manzili' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email orqali kelgan xom token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Yangi parol (kamida 8 ta belgi)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'If the email exists, instructions have been sent' })
  message: string;
}
