import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SortOrder } from 'prisma';

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

//// PaginationFilterOrderRequest request body

class FilterItem {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Field name to apply the filter on',
    example: 'age',
  })
  name: string;

  @IsString()
  @IsIn(['='])
  @ApiProperty({
    description: 'Filter operation, only "=" is supported',
    example: '=',
  })
  operation: '=';

  @ApiProperty({
    description: 'Filter value, can be a string or a number',
    example: 25,
  })
  value: string | number;
}

export class PaginationFilterOrderRequest {
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  perPage: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterItem)
  @ApiProperty({
    description: 'Array of filters to apply',
    type: [FilterItem],
    example: [{ name: 'age', operation: '=', value: 25 }],
  })
  filter: Array<FilterItem>;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Order direction, either ASC or DESC',
    example: 'ASC',
  })
  order: SortOrder;
}

export class PageableResponseDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: RoleResponse[];

  @ApiProperty({
    description: 'Total count of all matching items',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  currentPage: number;
}
