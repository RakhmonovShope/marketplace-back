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
import { diskStorage } from 'multer';
import { AudioService } from './audio.service';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { mkdirp } from 'mkdirp';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/auth.enum';
import { AudioResponseDto } from './audio.dto';
import * as process from 'node:process';

@ApiTags('Audio')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.AUDIO__UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a Audio' })
  @ApiResponse({ type: AudioResponseDto })
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: async (req, file, callback) => {
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString();
          const day = now.getDate().toString();

          const uploadPath = join(
            process.cwd(),
            'uploads',
            'audios',
            year,
            month,
            day,
          );

          await mkdirp(uploadPath);

          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const acceptedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/aac'];
        if (acceptedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new HttpException(
              'Unsupported audio file type',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiBody({
    description: 'Audio upload',
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    const uploadDir = file.destination;

    const baseUploadPath = join(process.cwd(), 'uploads', 'audios');

    const relativePath = uploadDir
      .replace(baseUploadPath, '')
      .split('/')
      .filter(Boolean);
    const [year, month, day] = relativePath;

    const audioUrl = `/${year}/${month}/${day}/${file.filename}`;

    const createdAudio = await this.audioService.createAudio({
      name: file.originalname,
      extension: extname(file.originalname),
      url: audioUrl,
    });

    return createdAudio;
  }

  @Get(':year/:month/:day/:name')
  @ApiOperation({ summary: 'Get a audio' })
  @ApiResponse({ status: 200, description: 'Streamlined image is returned' })
  async getAudio(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const audioRecord = await this.audioService.getAudioByPath(
      year,
      month,
      day,
      name,
    );

    const audioPath = this.audioService.getAudioPath(audioRecord.url);

    if (!this.audioService.audioExists(audioPath)) {
      throw new NotFoundException('Audio file not found on server');
    }

    const mimeType = this.audioService.getMimeType(audioPath);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${audioRecord.name}"`,
    });

    return this.audioService.streamAudio(audioPath);
  }

  @Get(':year/:month/:day/:name/info')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.AUDIO__VIEW)
  @ApiOperation({ summary: 'Get a audio info by path' })
  @ApiResponse({ status: 201, type: AudioResponseDto })
  @ApiResponse({ status: 404, description: 'Audio not found.' })
  async getAudioInfoByPath(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('name') name: string,
  ): Promise<AudioResponseDto> {
    if (!year || !month || !day || !name) {
      throw new BadRequestException('Invalid audio path parameters');
    }

    const audioRecord = await this.audioService.getAudioByPath(
      year,
      month,
      day,
      name,
    );

    const audioPath = this.audioService.getAudioPath(audioRecord.url);

    if (!this.audioService.audioExists(audioPath)) {
      throw new NotFoundException('Audio not found on server');
    }

    return this.audioService.mapToAudioResponseDto(audioRecord);
  }
}
