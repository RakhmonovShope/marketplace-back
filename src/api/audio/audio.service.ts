import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as AudioDTO from './audio.dto';
import { Audio as PrismaAudio } from '@prisma/client';

@Injectable()
export class AudioService {
  private logger = new Logger('AudioService');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createAudio(data: {
    name: string;
    extension: string;
    url: string;
  }): Promise<AudioDTO.AudioResponseDto> {
    this.logger.log('Uploading Audio to S3');

    const audio = await this.prisma.audio.create({
      data,
    });

    return this.mapToAudioResponseDto(audio);
  }

  async getAudioByPath(id: string): Promise<AudioDTO.AudioResponseDto> {
    const audio = await this.prisma.audio.findUnique({
      where: { id },
    });

    if (!audio) {
      throw new NotFoundException('Audio file not found in S3');
    }

    return this.mapToAudioResponseDto(audio);
  }

  getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      default:
        return 'application/octet-stream';
    }
  }

  mapToAudioResponseDto(audio: PrismaAudio): AudioDTO.AudioResponseDto {
    return {
      id: audio.id,
      name: audio.name,
      extension: audio.extension,
      url: audio.url,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
    };
  }
}
