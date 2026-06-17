import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(private readonly authService: AuthService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: { userId: string; email: string }) {
    try {
      await this.authService.sendEmailVerification(
        payload.userId,
        payload.email,
      );
    } catch (err) {
      this.logger.error(
        `user.registered listener failed for ${payload.userId} ${(err as Error).message}`,
      );
    }
  }
}
