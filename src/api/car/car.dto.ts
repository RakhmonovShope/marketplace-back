import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PageableDto } from 'common/common.dto';

export class CreateCar {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'id of the car',
    example: 'Example Value',
  })
  id: string;
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'name of the car',
    example: 'Example Value',
  })
  name: string;
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'govNumber of the car',
    example: 'Example Value',
  })
  govNumber: string;
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'made of the car',
    example: 'Example Value',
  })
  made: string;
  @IsNotEmpty()
  @ApiProperty({
    description: 'createdAt of the car',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
  @IsNotEmpty()
  @ApiProperty({
    description: 'updatedAt of the car',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class UpdateCar extends CreateCar {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Unique identifier for the car',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;
}

export class CarResponse {
  @ApiProperty({
    description: 'id of the car',
    example: 'Example Value',
  })
  id: string;
  @ApiProperty({
    description: 'name of the car',
    example: 'Example Value',
  })
  name: string;
  @ApiProperty({
    description: 'govNumber of the car',
    example: 'Example Value',
  })
  govNumber: string;
  @ApiProperty({
    description: 'made of the car',
    example: 'Example Value',
  })
  made: string;
  @ApiProperty({
    description: 'createdAt of the car',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'updatedAt of the car',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: CarResponse[];
}
