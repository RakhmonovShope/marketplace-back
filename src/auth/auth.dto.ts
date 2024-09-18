import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

import { GENDER, SUB_TYPE } from '@prisma/client';

export class SignUp {
  @IsString()
  @Length(12)
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(GENDER)
  @IsNotEmpty()
  gender: GENDER;

  @IsString()
  birthday: string;

  @IsEnum(SUB_TYPE)
  @IsNotEmpty()
  subType: SUB_TYPE;

  @IsBoolean()
  active: boolean;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignIn {
  @IsString()
  @IsNotEmpty()
  @Length(12)
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
