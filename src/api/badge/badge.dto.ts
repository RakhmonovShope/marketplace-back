import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BADGE_TYPE } from '@prisma/client';
import { PageableDto } from '../../common/common.dto';

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
    description: 'Icon of the page',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  icon: string;

  @IsEnum(BADGE_TYPE)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Type of the badge',
    example: 'STATIC',
  })
  type: BADGE_TYPE;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Background color of the badge',
    example: '#000000',
  })
  textColor: string;

  @ApiProperty({
    description: 'Background of the badge',
    example: {
      start: '#000000',
      end: '#FFFFFF',
    },
  })
  background: any;

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

export class BadgeResponse {
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

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Icon of the page',
    example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
  })
  icon: string;

  @IsEnum(BADGE_TYPE)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Type of the badge',
    example: 'STATIC',
  })
  type: BADGE_TYPE;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Background color of the badge',
    example: '#000000',
  })
  textColor: string;

  @ApiProperty({
    description: 'Background of the badge',
    example: {
      start: '#000000',
      end: '#FFFFFF',
    },
  })
  background: any;

  @IsBoolean()
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

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: BadgeResponse[];
}
