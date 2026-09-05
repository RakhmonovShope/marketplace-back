import { IsArray, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageableDto } from 'common/common.dto';

export class Create {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be UPPER_SNAKE_CASE (A-Z, 0-9, _)',
  })
  @ApiProperty({
    description: 'Stable role code used in code (UPPER_SNAKE_CASE, unique)',
    example: 'CONTENT_MANAGER',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name of the role in Uzbek',
    example: 'Admin',
  })
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name of the role in Russian',
    example: 'Администратор',
  })
  nameRu: string;

  @IsArray()
  @IsNotEmpty()
  @ApiProperty({
    description: 'List of permissions assigned to the role',
    example: ['READ', 'WRITE', 'DELETE'],
    type: [String],
  })
  permissions: string[];
}

export class Update extends Create {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Unique identifier for the role',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;
}

export class RoleResponse {
  @ApiProperty({
    description: 'Unique identifier for the role',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Stable role code (UPPER_SNAKE_CASE, unique)',
    example: 'SUPER_ADMIN',
  })
  code: string;

  @ApiProperty({
    description: 'System role — cannot be deleted via API',
    example: false,
  })
  isSystem: boolean;

  @ApiProperty({
    description: 'Name of the role in Uzbek',
    example: 'Admin',
  })
  nameUz: string;

  @ApiProperty({
    description: 'Name of the role in Russian',
    example: 'Администратор',
  })
  nameRu: string;

  @ApiProperty({
    description: 'Is the role active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Timestamp when the role was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the role was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'List of permissions assigned to the role',
    example: ['READ', 'WRITE', 'DELETE'],
    type: [String],
  })
  permissions: string[];
}

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: RoleResponse[];
}
