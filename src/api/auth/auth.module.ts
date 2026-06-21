import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategry';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from '../admin';
import { AuthListener } from './auth.listener';
import { EmailProcessor } from './email.processor';
import { BullModule } from '@nestjs/bullmq';

export const passportModule = PassportModule.register({
  defaultStrategy: 'jwt',
});

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_SESSION_EXPIRATION'),
        },
      }),
    }),
    forwardRef(() => passportModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminService,
    JwtStrategy,
    AuthListener,
    EmailProcessor,
  ],
  exports: [passportModule],
})
export class AuthModule {}
