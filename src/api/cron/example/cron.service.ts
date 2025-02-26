import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService {
  @Cron(CronExpression.EVERY_10_SECONDS)
  handleCron() {
    console.log('Cron job executed at:', new Date().toISOString());
  }

  @Cron('*/10 * * * * *')
  handleCustomCron() {
    console.log('Custom cron job running every 10 seconds');
  }
}
