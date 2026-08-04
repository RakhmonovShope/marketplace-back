import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

// Parallellikni JOB darajasida (worker concurrency) boshqaramiz, shuning uchun
// har bir sharp operatsiyasi 1 libvips thread ishlatsin — aks holda
// (worker_concurrency × cpu) thread ochilib, oversubscription bo'ladi.
sharp.concurrency(1);
// libvips ichki cache'ini cheklaymiz — ko'p parallel ishda RAM o'smasligi uchun.
sharp.cache({ memory: 50, files: 0, items: 0 });

@Injectable()
export class ImageService {
  async process(
    buffer: Buffer,
  ): Promise<{ optimized: Buffer; thumbnail: Buffer }> {
    // limitInputPixels — "decompression bomb" (kichik fayl, ulkan o'lcham)
    //   hujumidan himoya; ~268 MP'dan katta rasmlar rad etiladi.
    // failOn: 'truncated' — to'liq buzilgan fayllarda xato, lekin kichik
    //   ogohlantirishlarga toqat qiladi.
    const base = sharp(buffer, {
      limitInputPixels: 268_402_689, // 16383 x 16383
      failOn: 'truncated',
    }).rotate();

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
