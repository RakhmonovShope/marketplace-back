import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomerSessionGuard implements CanActivate {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.subType === 'CUSTOMER') {
      await this.redisClient.set(
        `session:${user.id}`,
        JSON.stringify(user),
        'EX',
        this.configService.get('SESSION_EXPIRATION'),
      );
      return true;
    }

    return false;
  }
}
