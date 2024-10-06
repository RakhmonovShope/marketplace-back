import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  constructor() {}

  // async setValue(key: string, value: string): Promise<void> {
  //   await this.redisClient.set(key, value);
  // }
  //
  // async getValue(key: string): Promise<string> {
  //   return await this.redisClient.get(key);
  // }
}
