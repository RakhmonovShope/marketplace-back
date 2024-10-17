import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
// src/user/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { GENDER, SUB_TYPE } from '@prisma/client';
import { PageableDto } from 'common/common.dto';

export class Create {
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

export class Update extends PartialType(OmitType(Create, ['password'])) {
  @ApiProperty({ description: `id` })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '123456789012',
  })
  phone: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Gender of the user',
    enum: GENDER,
    example: GENDER.MALE,
  })
  gender: GENDER;

  @ApiProperty({
    description: 'Birthday of the user',
    example: '1990-01-01',
  })
  birthday: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'Johnny',
    required: false,
  })
  name: string;

  @ApiProperty({
    description: 'Subtype of the user',
    enum: SUB_TYPE,
    example: SUB_TYPE.ADMIN,
  })
  subType: SUB_TYPE;

  @ApiProperty({
    description: 'Role ID of the user',
    example: 'role-id-example',
  })
  roleId: string;

  @ApiProperty({
    description: 'Is the user active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'password',
  })
  password: string;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: UserResponseDto[];
}
