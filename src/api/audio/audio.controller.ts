import {
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

@ApiTags('Audio')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.AUDIO__UPLOAD)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: async (req, file, callback) => {
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString();
          const day = now.getDate().toString();

          const uploadPath = join(
            __dirname,
            '..',
            '..',
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
        if (file.mimetype.match(/\/(mp3|wav|aac)$/)) {
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
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Upload a Audio' })
  @ApiResponse({ status: 201, description: 'Audio uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    console.log('Request is made');
    const uploadDir = file.destination;
    const baseUploadPath = join(__dirname, '..', '..', 'audios');
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
  @ApiResponse({ status: 200, description: 'Audio found and returned.' })
  @ApiResponse({ status: 404, description: 'Audio not found.' })
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
    const filePath = this.audioService.getAudioPath(audioRecord.url);

    if (!this.audioService.audioExists(filePath)) {
      throw new NotFoundException('Audio file not found on server');
    }

    const mimeType = this.audioService.getMimeType(filePath);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${audioRecord.name}"`,
    });

    return this.audioService.streamAudio(filePath);
  }
}
