import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create {
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
