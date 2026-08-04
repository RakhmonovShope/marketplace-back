// src/file/dto/file-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ImageStatus } from '@prisma/client';

export class FileResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the file',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Original name of the uploaded file',
    example: 'document.pdf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'URL to access the uploaded file',
    example: 'http://localhost:3000/2023/5/30/2QV6BxLRF2szKaDmshd1Fxkls6m.png',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Timestamp when the file was created',
    example: '2023-05-30T12:34:56.789Z',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the file was last updated',
    example: '2023-05-30T12:34:56.789Z',
  })
  @IsDate()
  updatedAt: Date;
}

/**
 * Async rasm yuklash javobi.
 * Upload paytida darhol qaytadi (status: PENDING), keyin worker ishlaydi.
 * Klient `optimizedUrl` paydo bo'lguncha shu `id` bo'yicha holatni poll qiladi.
 */
export class ImageUploadResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  id: string;

  @ApiProperty({
    enum: ImageStatus,
    example: ImageStatus.PENDING,
    description: 'Processing holati',
  })
  @IsEnum(ImageStatus)
  status: ImageStatus;

  @ApiProperty({ example: 'tg_image_4240714056.png' })
  @IsString()
  originalName: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '/2026/6/30/uuid.webp',
    description: "Tayyor bo'lganda — optimized webp url",
  })
  @IsOptional()
  @IsString()
  optimizedUrl: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '/2026/6/30/uuid.webp',
    description: "Tayyor bo'lganda — thumbnail webp url",
  })
  @IsOptional()
  @IsString()
  thumbnailUrl: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "FAILED bo'lsa — xato sababi",
  })
  @IsOptional()
  @IsString()
  error: string | null;

  @ApiProperty({ example: '2026-06-30T12:34:56.789Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2026-06-30T12:34:56.789Z' })
  @IsDate()
  updatedAt: Date;
}
