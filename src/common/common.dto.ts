import { ApiProperty } from '@nestjs/swagger';

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
