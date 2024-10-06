import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from './redis';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    this.redisService.setValue('key', 'shope');

    this.redisService.getValue('key').then((res) => console.log(res));

    return this.appService.getHello();
  }
}
