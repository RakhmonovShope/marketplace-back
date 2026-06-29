import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

@Injectable()
export class ImageService {
  async process(
    buffer: Buffer,
  ): Promise<{ optimized: Buffer; thumbnail: Buffer }> {
    const base = sharp(buffer).rotate();

    const optimized = await base
      .clone()
      .resize({
        width: 1600,
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbnail = await base
      .clone()
      .resize({
        width: 300,
        height: 300,
        fit: 'cover',
      })
      .webp({ quality: 70 })
      .toBuffer();

    return { optimized, thumbnail };
  }
}
