import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as FileDTO from './file.dto';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'fs';
import { File as PrismaFile } from '@prisma/client';
import * as process from 'node:process';

import { writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createFile(data: {
    name: string;
    url: string;
  }): Promise<FileDTO.FileResponseDto> {
    const file = await this.prisma.file.create({
      data,
    });

    return this.mapToFileResponseDto(file);
  }

  async getFileByPath(
    year: string,
    month: string,
    day: string,
    name: string,
  ): Promise<FileDTO.FileResponseDto> {
    const url = `/${year}/${month}/${day}/${name}`;

    const file = await this.prisma.file.findUnique({
      where: { url },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.mapToFileResponseDto(file);
  }

  getFilePath(url: string): string {
    if (url.includes('..')) {
      throw new BadRequestException('Invalid file URL');
    }

    const relativePath = url.startsWith('/') ? url.slice(1) : url;

    return join(process.cwd(), 'uploads', 'files', ...relativePath.split('/'));
  }

  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  streamFile(filePath: string): StreamableFile {
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp': // ← qo'shasiz
        return 'image/webp'; // ← qo'shasiz
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }

  mapToFileResponseDto(file: PrismaFile): FileDTO.FileResponseDto {
    return {
      id: file.id,
      name: file.name,
      url: file.url,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  async saveImageBuffer(
    buffer: Buffer,
    originalName: string,
  ): Promise<FileDTO.FileResponseDto> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString();
    const day = now.getDate().toString();

    const uploadDir = join(process.cwd(), 'uploads', 'files', year, month, day);
    await mkdirp(uploadDir);

    const filename = `${uuidv4()}.webp`;
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/${year}/${month}/${day}/${filename}`;
    return this.createFile({ name: originalName, url });
  }
}
