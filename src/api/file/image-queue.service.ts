import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FileService } from './file.service';
import { IMAGE_JOB, IMAGE_QUEUE, ImageJobData } from './image.processor';

/**
 * Rasm processing navbatini boshqaradi va "yo'qolish"dan himoya qiladi.
 *
 * Durability kafolati (3 qatlam):
 *  1. Original fayl upload paytida DARHOL diskka yoziladi.
 *  2. Holat Postgres'da (ImageUpload) saqlanadi.
 *  3. Job Redis'da (BullMQ) saqlanadi — server qulasa, restart'da davom etadi.
 *
 * Agar Redis tushib qolgan bo'lsa (enqueue muvaffaqiyatsiz), yozuv PENDING
 * holatda qoladi va bu servis (startup + har daqiqa cron) uni qayta navbatga
 * qo'yadi. Shu sabab birorta ham rasm yo'qolmaydi.
 */
@Injectable()
export class ImageQueueService implements OnModuleInit {
  private readonly logger = new Logger(ImageQueueService.name);

  // Shu vaqtdan eski PROCESSING yozuvlar "osilib qolgan" hisoblanadi
  // (worker o'rtada qulagan) va qayta navbatga qo'yiladi.
  private readonly STALE_MS = 5 * 60 * 1000;

  // Recovery'lar bir-birining ustiga chiqmasligi uchun oddiy qulf.
  private recovering = false;

  constructor(
    @InjectQueue(IMAGE_QUEUE) private readonly queue: Queue<ImageJobData>,
    private readonly fileService: FileService,
  ) {}

  /**
   * Navbatga qo'yadi. jobId = imageUploadId — BullMQ DEDUPE:
   * bir xil rasm uchun bir vaqtda ikkita job qo'shilmaydi
   * (retry/recovery dublikat yaratmaydi).
   */
  async enqueue(imageUploadId: string): Promise<void> {
    await this.queue.add(
      IMAGE_JOB,
      { imageUploadId },
      { jobId: imageUploadId },
    );
  }

  /** Server ko'tarilganda — Redis/server qulashidan keyin qolib ketganlarni tiklaymiz. */
  async onModuleInit(): Promise<void> {
    await this.recover('startup');
  }

  /** Har daqiqa — Redis vaqtincha tushib qolgan bo'lsa, qayta urinib ko'ramiz. */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledRecover(): Promise<void> {
    await this.recover('cron');
  }

  private async recover(trigger: string): Promise<void> {
    if (this.recovering) return;
    this.recovering = true;
    try {
      const staleBefore = new Date(Date.now() - this.STALE_MS);
      const stuck = await this.fileService.findStuckImageUploads(staleBefore);
      if (stuck.length === 0) return;

      let requeued = 0;
      for (const record of stuck) {
        try {
          await this.enqueue(record.id);
          requeued++;
        } catch (err) {
          this.logger.error(
            `[${trigger}] enqueue failed for ${record.id}: ${(err as Error).message}`,
          );
        }
      }
      this.logger.warn(
        `[${trigger}] re-enqueued ${requeued}/${stuck.length} stuck image(s)`,
      );
    } catch (err) {
      // Masalan Redis hali ham tushgan — keyingi cron'da yana urinamiz.
      this.logger.error(
        `[${trigger}] recovery failed: ${(err as Error).message}`,
      );
    } finally {
      this.recovering = false;
    }
  }
}
