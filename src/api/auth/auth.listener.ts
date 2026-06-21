import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: { userId: string; email: string }) {
    try {
      await this.emailQueue.add('send-verification', payload);
    } catch (err) {
      this.logger.error(
        `Failed to enqueue email job ${(err as Error).message}`,
      );
    }
  }
}
