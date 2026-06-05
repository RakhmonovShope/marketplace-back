import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Global modul — bir marta AppModule'ga qo'shamiz, qolgan modullarga
// MailService'ni qayta import qilmasdan inject qilish mumkin bo'ladi.
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
