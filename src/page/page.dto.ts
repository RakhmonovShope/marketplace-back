import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name Uz of the page in Uzbek',
    example: 'Contact Uz',
  })
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name Ru of the page in Russian',
    example: 'Contact Ru',
  })
  nameRu: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Content Uz of the page in Uzbek',
    example: '<p>Ushbu sahifada ...</p>',
  })
  contentUz: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Content Ru of the page in Russian',
    example: '<p>На этой странице ...</p>',
  })
  contentRu: string;

  @IsBoolean()
  @ApiProperty({
    description: 'Indicates if the page is active',
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

export class PageResponse {
  @ApiProperty({
    description: 'Unique identifier for the page',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;
  @ApiProperty({
    description: 'Name of the page in Uzbek',
    example: 'Sahifa',
  })
  nameUz: string;

  @ApiProperty({
    description: 'Name of the page in Russian',
    example: 'Страница',
  })
  nameRu: string;

  @ApiProperty({
    description: 'Content of the page in Uzbek',
    example: '<p>Ushbu sahifada ...</p>',
  })
  contentUz: string;

  @ApiProperty({
    description: 'Content of the page in Russian',
    example: '<p>На этой странице ...</p>',
  })
  contentRu: string;

  @ApiProperty({
    description: 'Indicates if the page is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Timestamp when the page was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the page was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}