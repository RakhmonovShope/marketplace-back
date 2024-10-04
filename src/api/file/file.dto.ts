// src/file/dto/file-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString, IsUrl, IsUUID } from 'class-validator';

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
