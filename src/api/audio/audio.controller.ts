import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { AudioService } from './audio.service';
import { v4 as uuidv4 } from 'uuid';
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

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

@ApiTags('Audio')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.AUDIO__UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an Audio' })
  @ApiResponse({ type: AudioResponseDto })
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
          cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
          const filename = `${uuidv4()}${file.originalname}`;
          cb(null, `uploads/audios/${filename}`);
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
  async uploadAudio(@UploadedFile() file: Express.MulterS3File) {
    const audioUrl = file.location;

    const createdAudio = await this.audioService.createAudio({
      name: file.originalname,
      extension: file.mimetype.split('/').pop(),
      url: audioUrl,
    });

    return createdAudio;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an audio file' })
  @ApiResponse({ status: 200, description: 'Returns the audio file from S3' })
  async getAudio(@Param('id') id: string, @Res() res: Response) {
    const audioRecord = await this.audioService.getAudioByPath(id);

    if (!audioRecord) {
      throw new NotFoundException('Audio file not found');
    }

    res.redirect(audioRecord.url);
  }

  @Get(':id/info')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), PermissionsGuard)
  @Permissions(PERMISSIONS.AUDIO__VIEW)
  @ApiOperation({ summary: 'Get audio info by path' })
  @ApiResponse({ status: 200, type: AudioResponseDto })
  @ApiResponse({ status: 404, description: 'Audio not found.' })
  async getAudioInfoByPath(@Param('id') id: string): Promise<AudioResponseDto> {
    const audioRecord = await this.audioService.getAudioByPath(id);

    if (!audioRecord) {
      throw new NotFoundException('Audio not found');
    }

    return this.audioService.mapToAudioResponseDto(audioRecord);
  }
}
