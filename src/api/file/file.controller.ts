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
import { diskStorage, memoryStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as path from 'path';
import { extname, join } from 'path';
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
import { mkdirp } from 'mkdirp';
import { SkipThrottle } from '@nestjs/throttler';
import { Permissions } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/auth.enum';
import * as process from 'node:process';
import { ImageUploadResponseDto } from './file.dto';
import { ImageQueueService } from './image-queue.service';

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
      storage: diskStorage({
        destination: async (req, file, callback) => {
          try {
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString();
            const day = now.getDate().toString();

            const uploadPath = join(
              process.cwd(),
              'uploads',
              'files',
              year,
              month,
              day,
            );

            await mkdirp(uploadPath);

            callback(null, uploadPath);
          } catch (error) {
            callback(error, '');
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, callback) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|svg)$/)) {
          callback(null, true);
        } else {
          callback(
            new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST),
            false,
          );
        }
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, type: FileResponseDto })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('File upload failed', HttpStatus.BAD_REQUEST);
    }

    const uploadDir = file.destination;
    const baseUploadPath = join(process.cwd(), 'uploads', 'files');
    const relativePath = uploadDir
      .replace(baseUploadPath, '')
      .split(path.sep)
      .filter(Boolean);
    const [year, month, day] = relativePath;

    const fileUrl = `/${year}/${month}/${day}/${file.filename}`;

    const createdFile = await this.fileService.createFile({
      name: file.originalname,
      url: fileUrl,
    });

    return createdFile;
  }

  @Post('image')
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // ← diskka emas, xotiraga (buffer kerak)
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (sharp kichraytiradi)
      fileFilter: (req, file, callback) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          callback(null, true);
        } else {
          callback(
            new HttpException('Unsupported image type', HttpStatus.BAD_REQUEST),
            false,
          );
        }
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image upload',
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
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
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImageUploadResponseDto> {
    if (!file) {
      throw new HttpException('Image upload failed', HttpStatus.BAD_REQUEST);
    }

    // 1) Original'ni DARHOL diskka yozamiz — durable manba.
    //    Shu nuqtadan keyin server qulasa ham rasm yo'qolmaydi.
    const originalPath = await this.fileService.saveOriginalBuffer(
      file.buffer,
      file.originalname,
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
    const disposition =
      dispositionHeader?.toLowerCase() === 'attachment'
        ? 'attachment'
        : 'inline';

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `${disposition}; filename="${fileRecord.name}"`,
    });

    return this.fileService.streamFile(filePath);
  }

  @Get(':year/:month/:day/:name/info')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__VIEW)
  @ApiOperation({ summary: 'Get a file info by path' })
  @ApiResponse({ status: 201, type: FileResponseDto })
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
