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
import { File as PrismaFile, ImageStatus, ImageUpload } from '@prisma/client';
import * as process from 'node:process';

import { readFile, unlink, writeFile } from 'fs/promises';
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

  // ──────────────────────────────────────────────────────────────────────────
  // Async rasm processing (durable) — ImageUpload tracking
  // ──────────────────────────────────────────────────────────────────────────

  /** Xom original fayllar saqlanadigan ildiz papka. */
  private originalsRoot(): string {
    return join(process.cwd(), 'uploads', 'originals');
  }

  /** Diskdagi absolyut original yo'lni qaytaradi (path traversal'dan himoyalangan). */
  getOriginalAbsolutePath(relativePath: string): string {
    if (relativePath.includes('..')) {
      throw new BadRequestException('Invalid original path');
    }
    const rel = relativePath.startsWith('/')
      ? relativePath.slice(1)
      : relativePath;
    return join(this.originalsRoot(), ...rel.split('/'));
  }

  /** Original buffer'ni yyyy/mm/dd ostiga DARHOL diskka yozadi (durable manba). */
  async saveOriginalBuffer(
    buffer: Buffer,
    originalName: string,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString();
    const day = now.getDate().toString();

    const dir = join(this.originalsRoot(), year, month, day);
    await mkdirp(dir);

    const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
    const filename = `${uuidv4()}.${ext}`;
    await writeFile(join(dir, filename), buffer);

    // relativ yo'lni qaytaramiz — DB'da shu saqlanadi
    return `/${year}/${month}/${day}/${filename}`;
  }

  /** ImageUpload yozuvini PENDING holatda yaratadi. */
  async createImageUpload(
    originalName: string,
    originalPath: string,
  ): Promise<ImageUpload> {
    return this.prisma.imageUpload.create({
      data: { originalName, originalPath, status: ImageStatus.PENDING },
    });
  }

  /** Worker boshlanishida — PROCESSING + attempts++ */
  async markProcessing(id: string): Promise<ImageUpload> {
    return this.prisma.imageUpload.update({
      where: { id },
      data: { status: ImageStatus.PROCESSING, attempts: { increment: 1 } },
    });
  }

  /** Muvaffaqiyatli yakun — DONE + url'lar. */
  async completeImageUpload(
    id: string,
    optimizedUrl: string,
    thumbnailUrl: string,
  ): Promise<ImageUpload> {
    return this.prisma.imageUpload.update({
      where: { id },
      data: {
        status: ImageStatus.DONE,
        optimizedUrl,
        thumbnailUrl,
        error: null,
      },
    });
  }

  /** Barcha urinishlar tugagach — FAILED + sabab. */
  async failImageUpload(id: string, error: string): Promise<void> {
    await this.prisma.imageUpload.update({
      where: { id },
      data: { status: ImageStatus.FAILED, error: error.slice(0, 1000) },
    });
  }

  /** Worker uchun — xom yozuv (yo'q bo'lsa null). */
  getImageUploadRaw(id: string): Promise<ImageUpload | null> {
    return this.prisma.imageUpload.findUnique({ where: { id } });
  }

  /** Diskdan original buffer'ni o'qiydi. */
  readOriginal(originalPath: string): Promise<Buffer> {
    return readFile(this.getOriginalAbsolutePath(originalPath));
  }

  /** Processing tugagach xom original'ni o'chiradi (disk tejash). Xato bo'lsa jim. */
  async deleteOriginal(originalPath: string): Promise<void> {
    try {
      await unlink(this.getOriginalAbsolutePath(originalPath));
    } catch {
      // fayl allaqachon yo'q bo'lishi mumkin — muammo emas
    }
  }

  /**
   * Recovery uchun: "osilib qolgan" yozuvlar.
   * - PENDING: hech qachon (yoki Redis tushib qolgani uchun) navbatga tushmagan;
   * - PROCESSING: worker o'rtada qulagan (server restart).
   * `staleBefore` — shu vaqtdan eski PROCESSING'lar qayta navbatga qo'yiladi.
   */
  findStuckImageUploads(staleBefore: Date, take = 500): Promise<ImageUpload[]> {
    return this.prisma.imageUpload.findMany({
      where: {
        OR: [
          { status: ImageStatus.PENDING },
          { status: ImageStatus.PROCESSING, updatedAt: { lt: staleBefore } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  async getImageUploadDto(id: string): Promise<FileDTO.ImageUploadResponseDto> {
    const record = await this.prisma.imageUpload.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('Image upload not found');
    }
    return this.mapToImageUploadDto(record);
  }

  mapToImageUploadDto(r: ImageUpload): FileDTO.ImageUploadResponseDto {
    return {
      id: r.id,
      status: r.status,
      originalName: r.originalName,
      optimizedUrl: r.optimizedUrl,
      thumbnailUrl: r.thumbnailUrl,
      error: r.error,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
