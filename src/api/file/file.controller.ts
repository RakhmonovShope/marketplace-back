import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as path from 'path';
import { extname, join } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import * as FileDTO from './file.dto';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { mkdirp } from 'mkdirp';
import { Permissions } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/auth.enum';

@ApiTags('File')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

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
              __dirname,
              '..',
              '..',
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
  @ApiResponse({ status: 201, description: 'File uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('File upload failed', HttpStatus.BAD_REQUEST);
    }

    const uploadDir = file.destination;
    const baseUploadPath = join(__dirname, '..', '..', 'files');
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

  @Get(':year/:month/:day/:name')
  @ApiOperation({ summary: 'Get a file' })
  @ApiResponse({ status: 200, description: 'File found and returned.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async getFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('name') name: string,
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

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileRecord.name}"`,
    });

    return this.fileService.streamFile(filePath);
  }

  @Get(':year/:month/:day/:name/info')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.FILE__VIEW)
  @ApiOperation({ summary: 'Get a file info by path' })
  @ApiResponse({ status: 200, description: 'File found and returned.' })
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
