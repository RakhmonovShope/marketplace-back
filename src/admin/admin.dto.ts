import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

import { GENDER, SUB_TYPE } from '@prisma/client';

export class Create {
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

export class Update {
  @IsString()
  @IsNotEmpty()
  id: string;

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
}
