import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'fs';
import * as AudioDTO from './audio.dto';
import { Audio as PrismaAudio } from '@prisma/client';

@Injectable()
export class AudioService {
  private logger = new Logger('Audio service');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createAudio(data: {
    name: string;
    extension: string;
    url: string;
  }): Promise<AudioDTO.AudioResponseDto> {
    this.logger.log('Uploading Audio');

    const audio = await this.prisma.audio.create({
      data,
    });

    return this.mapToAudioResponseDto(audio);
  }

  async getAudioByPath(
    year: string,
    month: string,
    day: string,
    name: string,
  ): Promise<AudioDTO.AudioResponseDto> {
    const url = `/${year}/${month}/${day}/${name}`;

    const audio = await this.prisma.audio.findUnique({
      where: { url },
    });

    if (!audio) {
      throw new NotFoundException('Audio file not found');
    }

    return this.mapToAudioResponseDto(audio);
  }

  getAudioPath(url: string): string {
    if (url.includes('..')) {
      throw new BadRequestException('Invalid file URL');
    }

    const relativePath = url.startsWith('/') ? url.slice(1) : url;

    return join(__dirname, '..', '..', 'audios', ...relativePath.split('/'));
  }

  audioExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  streamAudio(filePath: string): StreamableFile {
    const audioStream = createReadStream(filePath);
    return new StreamableFile(audioStream);
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
