import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly authService: AuthService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} ${job.name}`);

    switch (job.name) {
      case 'send-verification':
        await this.authService.sendEmailVerification(
          job.data.userId,
          job.data.email,
        );
        break;
      default:
        this.logger.warn(`Unknown job ${job.name}`);
    }
  }
}
