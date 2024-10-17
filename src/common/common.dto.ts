import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from 'prisma';

export class PageableDto {
  @ApiProperty({
    description: 'Total count of all matching items',
    example: 100,
  })
  totalItems: number;

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
