import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import * as FileDTO from './file.dto';
import { FileResponseDto } from './file.dto';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Permissions } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/auth.enum';
import { ImageUploadResponseDto } from './file.dto';
import { ImageQueueService } from './image-queue.service';

// Mijoz e'lon qilgan mimetype bo'yicha ARZON birinchi filtr (multer, buffer'gacha).
// Haqiqiy tekshiruv — magic-byte (FileService.detectImageType). SVG ATAYIN yo'q:
// u XML/matn, ichida <script> bo'lishi mumkin (stored XSS) — sanitizatsiyasiz qabul qilinmaydi.
const IMAGE_MIME_RE = /^image\/(jpe?g|png|webp|gif|avif)$/;

const imageMimeFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) => {
  if (IMAGE_MIME_RE.test(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST),
      false,
    );
  }
};

const uploadSchema = {
  type: 'object',
  properties: { file: { type: 'string', format: 'binary' } },
};

@ApiTags('File')
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly fileService: FileService,
    private readonly imageQueue: ImageQueueService,
  ) {}

  @Post('upload')
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // avval tekshiramiz, keyin diskka yozamiz
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: imageMimeFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload (jpg, png, webp, gif, avif)',
    schema: uploadSchema,
  })
  @ApiOperation({
    summary: 'Upload an image as-is (no optimization)',
    description:
      "Fayl magic-byte bo'yicha tekshiriladi va ANIQLANGAN kengaytma bilan saqlanadi " +
      "(nom/mimetype soxtalashtirilsa ham). Optimizatsiya kerak bo'lsa POST /files/image.",
  })
  @ApiResponse({ status: 201, type: FileResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported or corrupted file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileDTO.FileResponseDto> {
    if (!file) {
      throw new BadRequestException('File upload failed');
    }

    const { ext } = await this.fileService.detectImageType(file.buffer);

    return this.fileService.saveBuffer(file.buffer, file.originalname, ext);
  }

  @Post('image')
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // ← diskka emas, xotiraga (buffer kerak)
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (sharp kichraytiradi)
      fileFilter: imageMimeFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Image upload', schema: uploadSchema })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Upload image (async) — original darhol saqlanadi, processing fonda',
    description:
      'Original fayl darhol diskka yoziladi va processing BullMQ navbatiga ' +
      "qo'yiladi. 202 + {id, status: PENDING} qaytadi. Klient natijani " +
      "GET /v1/files/images/:id orqali poll qiladi (status DONE bo'lguncha).",
  })
  @ApiResponse({ status: 202, type: ImageUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported or corrupted image' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImageUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Image upload failed');
    }

    // 0) Haqiqiy turini magic-byte bo'yicha aniqlaymiz (mimetype'ga ishonmaymiz).
    const { ext } = await this.fileService.detectImageType(file.buffer);

    // 1) Original'ni DARHOL diskka yozamiz — durable manba.
    //    Shu nuqtadan keyin server qulasa ham rasm yo'qolmaydi.
    const originalPath = await this.fileService.saveOriginalBuffer(
      file.buffer,
      ext,
    );

    // 2) Tracking yozuvi (PENDING). Holat manbai — Postgres.
    const record = await this.fileService.createImageUpload(
      file.originalname,
      originalPath,
    );

    // 3) Navbatga qo'yamiz. Redis tushib qolsa ham xato qaytarmaymiz:
    //    yozuv PENDING qoladi va ImageQueueService (recovery) keyin qo'yadi.
    try {
      await this.imageQueue.enqueue(record.id);
    } catch (err) {
      this.logger.error(
        `Enqueue failed for ${record.id}, recovery will retry: ${(err as Error).message}`,
      );
    }

    // 4) Darhol javob — CPU bloklanmaydi, og'ir ish fonda.
    return this.fileService.mapToImageUploadDto(record);
  }

  @Get('images/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__VIEW)
  @ApiOperation({
    summary: 'Rasm processing holatini olish (poll qilish uchun)',
  })
  @ApiResponse({ status: 200, type: ImageUploadResponseDto })
  @ApiResponse({ status: 404, description: 'Image upload not found.' })
  async getImageStatus(
    @Param('id') id: string,
  ): Promise<ImageUploadResponseDto> {
    return this.fileService.getImageUploadDto(id);
  }

  // Static fayl yetkazib berish — bu API resursi emas, jismoniy fayl.
  // URL barqaror bo'lishi uchun versiyalanmaydi: /files/... (/v1/files/... emas).
  // Bitta sahifa o'nlab rasm so'raydi — rate limit qo'llanmaydi.
  @SkipThrottle()
  @Version(VERSION_NEUTRAL)
  @Get(':year/:month/:day/:name')
  @ApiOperation({ summary: 'Get a file' })
  @ApiResponse({ status: 200, description: 'File found and returned.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async getFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('name') name: string,
    @Headers('x-content-disposition') dispositionHeader: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!year || !month || !day || !name) {
      throw new BadRequestException('Invalid file path parameters');
    }

    const fileRecord = await this.fileService.getFileByPath(
      year,
      month,
      day,
      name,
    );

    const filePath = this.fileService.getFilePath(fileRecord.url);

    if (!this.fileService.fileExists(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    const mimeType = this.fileService.getMimeType(filePath);

    // Front `X-Content-Disposition: attachment` yuborsa — yuklab olishga,
    // aks holda (yoki `inline`) brauzerda / <img> tag'da ko'rsatamiz.
    // Faqat "xavfsiz" rasm turlari inline bo'ladi; qolganlari (svg, octet-stream)
    // HAR DOIM attachment — brauzer ularni sahifa sifatida bajarmasin.
    const wantsAttachment =
      dispositionHeader?.toLowerCase() === 'attachment' ||
      !this.fileService.isInlineSafe(mimeType);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': this.fileService.contentDisposition(
        wantsAttachment ? 'attachment' : 'inline',
        fileRecord.name,
      ),
      // Fayl nomi UUID — mazmuni hech qachon o'zgarmaydi: 1 yil cache.
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Brauzer Content-Type'ni "hidlab" boshqa turga aylantirmasin.
      'X-Content-Type-Options': 'nosniff',
      // Fayl to'g'ridan-to'g'ri ochilsa ham skript/iframe/plugin ishlamasin.
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });

    return this.fileService.streamFile(filePath);
  }

  @Get(':year/:month/:day/:name/info')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__VIEW)
  @ApiOperation({ summary: 'Get a file info by path' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async getFileInfoByPath(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('name') name: string,
  ): Promise<FileDTO.FileResponseDto> {
    if (!year || !month || !day || !name) {
      throw new BadRequestException('Invalid file path parameters');
    }

    const fileRecord = await this.fileService.getFileByPath(
      year,
      month,
      day,
      name,
    );

    const filePath = this.fileService.getFilePath(fileRecord.url);

    if (!this.fileService.fileExists(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    return this.fileService.mapToFileResponseDto(fileRecord);
  }
}
