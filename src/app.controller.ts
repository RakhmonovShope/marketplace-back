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
    this.redisService.setValue('test', 'test');

    this.redisService.getValue('test').then((value) => {
      console.log(value);
    });

    return this.appService.getHello();
  }
}
