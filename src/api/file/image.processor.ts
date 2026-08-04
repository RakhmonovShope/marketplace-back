import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as os from 'os';
import { FileService } from './file.service';
import { ImageService } from './image.service';

export const IMAGE_QUEUE = 'image';
export const IMAGE_JOB = 'process-image';

export interface ImageJobData {
  imageUploadId: string;
}

// Bir vaqtda nechta rasm parallel ishlanadi.
// Default — CPU yadrolari soni (oversubscription bo'lmasligi uchun).
// Yuqori yukda env orqali sozlanadi: IMAGE_CONCURRENCY.
const IMAGE_CONCURRENCY = Math.max(
  1,
  Number(process.env.IMAGE_CONCURRENCY) || os.cpus().length,
);

@Processor(IMAGE_QUEUE, { concurrency: IMAGE_CONCURRENCY })
export class ImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(
    private readonly fileService: FileService,
    private readonly imageService: ImageService,
  ) {
    super();
    this.logger.log(`ImageProcessor concurrency = ${IMAGE_CONCURRENCY}`);
  }

  async process(job: Job<ImageJobData>): Promise<void> {
    const { imageUploadId } = job.data;

    const record = await this.fileService.getImageUploadRaw(imageUploadId);

    // Yozuv o'chirilgan bo'lsa — qiladigan ish yo'q.
    if (!record) {
      this.logger.warn(`ImageUpload ${imageUploadId} not found, skipping`);
      return;
    }

    // Idempotentlik: retry/recovery natijasida ikki marta kelsa —
    // allaqachon tayyor bo'lsa qayta ishlamaymiz.
    if (record.status === 'DONE') {
      this.logger.debug(`ImageUpload ${imageUploadId} already DONE, skipping`);
      return;
    }

    await this.fileService.markProcessing(imageUploadId);

    // 1) Diskdagi original'ni o'qiymiz (durable manba).
    const buffer = await this.fileService.readOriginal(record.originalPath);

    // 2) sharp bilan optimized + thumbnail (CPU-bound, shu yerda controlled).
    const { optimized, thumbnail } = await this.imageService.process(buffer);

    // 3) Ikkalasini diskka yozib, File yozuvlarini yaratamiz (serving uchun).
    const opt = await this.fileService.saveImageBuffer(
      optimized,
      record.originalName,
    );
    const thumb = await this.fileService.saveImageBuffer(
      thumbnail,
      `thumb-${record.originalName}`,
    );

    // 4) Holatni DONE qilamiz.
    await this.fileService.completeImageUpload(
      imageUploadId,
      opt.url,
      thumb.url,
    );

    // 5) Endi xom original kerak emas — diskni tejaymiz.
    await this.fileService.deleteOriginal(record.originalPath);

    this.logger.log(`ImageUpload ${imageUploadId} processed → ${opt.url}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ImageJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    const id = job.data?.imageUploadId;
    if (!id) return;

    if (job.attemptsMade >= maxAttempts) {
      // Oxirgi urinish ham bo'lmadi — terminal FAILED.
      // Original disk'da qoladi (qo'lda qayta ishlash imkoni uchun).
      await this.fileService.failImageUpload(id, err.message);
      this.logger.error(
        `ImageUpload ${id} FAILED after ${job.attemptsMade} attempts: ${err.message}`,
      );
    } else {
      this.logger.warn(
        `ImageUpload ${id} attempt ${job.attemptsMade}/${maxAttempts} failed, will retry: ${err.message}`,
      );
    }
  }
}
