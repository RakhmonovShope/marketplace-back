import { BadRequestException } from '@nestjs/common';

export const audioFileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith('audio/')) {
    return callback(
      new BadRequestException('Only audio files are allowed!'),
      false,
    );
  }
  callback(null, true);
};
