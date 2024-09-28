import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
// src/category/dto/category-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class Create {
  @ApiProperty({ description: 'nameUz' })
  @IsString()
  @IsNotEmpty()
  nameUz: string;

  @ApiProperty({ description: 'nameRu' })
  @IsString()
  @IsNotEmpty()
  nameRu: string;

  @ApiProperty({ description: 'descriptionUz' })
  @IsString()
  @IsNotEmpty()
  descriptionUz: string;

  @ApiProperty({ description: 'descriptionRu' })
  @IsString()
  @IsNotEmpty()
  descriptionRu: string;

  @ApiProperty({ description: 'slugUz' })
  @IsString()
  @IsNotEmpty()
  slugUz: string;

  @ApiProperty({ description: 'slugRu' })
  @IsString()
  @IsNotEmpty()
  slugRu: string;

  @ApiProperty({ description: 'position' })
  @IsNumber()
  position: number;

  @ApiProperty({ description: 'active' })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: 'parentId' })
  @IsString()
  @IsOptional()
  parentId: string;
}

export class Update extends Create {
  @ApiProperty({ description: 'id' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class CategoryResponse {
  @ApiProperty({
    description: 'Unique identifier for the category',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Category name in Uzbek',
    example: 'Elektronika',
  })
  nameUz: string;

  @ApiProperty({
    description: 'Category name in Russian',
    example: 'Электроника',
  })
  nameRu: string;

  @ApiProperty({
    description: 'Category description in Uzbek',
    example: 'Описание на узбекском',
  })
  descriptionUz: string;

  @ApiProperty({
    description: 'Category description in Russian',
    example: 'Описание на русском',
  })
  descriptionRu: string;

  @ApiProperty({
    description: 'Slug for the category in Uzbek',
    example: 'elektronika-uz',
  })
  slugUz: string;

  @ApiProperty({
    description: 'Slug for the category in Russian',
    example: 'elektronika-ru',
  })
  slugRu: string;

  @ApiProperty({
    description: 'Position of the category',
    example: 1,
  })
  position: number;

  @ApiProperty({
    description: 'Parent category ID',
    example: 'parent-id-example',
    required: false,
  })
  parentId?: string;

  @ApiProperty({
    description: 'Is the category active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Timestamp when the category was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the category was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}
