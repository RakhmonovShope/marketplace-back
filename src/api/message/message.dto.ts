import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageableDto } from 'common/common.dto';

export class CreateMessage {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the sender',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  senderId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the receiver',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  receiverId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how are you?',
  })
  content: string;
}

export class UpdateMessage extends CreateMessage {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;
}

export class MessageResponse {
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Unique identifier for the sender',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  senderId: string;

  @ApiProperty({
    description: 'Unique identifier for the receiver',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  receiverId: string;

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how are you?',
  })
  content: string;

  @ApiProperty({
    description: 'Timestamp when the message was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the message was last updated',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class PageableResponseDto extends PageableDto {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  data: MessageResponse[];
}
