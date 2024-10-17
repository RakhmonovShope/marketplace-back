import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageableDto } from 'common/common.dto';

export class Create {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'NameUz of the brand in Uzbek',
    example: 'brand Uz',
  })
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'NameRU of the brand in RU',
    example: 'brand RU',
  })
  nameRu: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'cover of the store',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  cover: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'logo of the store',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  logo: string;

  @IsBoolean()
  @ApiProperty({
    description: 'Indicates if the store is active',
    example: true,
  })
  active: boolean;
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

export class BrandResponse {
  @ApiProperty({
    description: 'Unique identifier for the store',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'NameUz of the brand in Uzbek',
    example: 'brand Uz',
  })
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'NameRU of the brand in RU',
    example: 'brand RU',
  })
  nameRu: string;

  @IsString()
  @ApiProperty({
    description: 'cover of the store',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  cover: string;

  @IsString()
  @ApiProperty({
    description: 'logo of the store',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  logo: string;

  @IsBoolean()
  @ApiProperty({
    description: 'Indicates if the store is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Timestamp when the store was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the store was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: BrandResponse[];
}
