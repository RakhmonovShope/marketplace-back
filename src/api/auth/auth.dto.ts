import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
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
