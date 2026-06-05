import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Email yuborish servis'i.
 *
 * Ikki rejimda ishlay oladi (MAIL_TRANSPORT env'i bilan):
 *  1) 'console' — harfni real yubormaydi, balki Logger orqali console'ga chiqaradi.
 *     Dev/local muhitda qulay: SMTP sozlash shart emas, link to'g'ridan-to'g'ri loglarda ko'rinadi.
 *  2) 'smtp'    — haqiqiy SMTP server orqali yuboradi (SMTP_HOST/PORT/USER/PASS).
 *
 * Bu yondashuv juniorga tushunarli: birinchi bosqichda dev rejimda ishga tushadi,
 * keyin SMTP sozlanganda hech qanday kod o'zgartirmasdan production'ga chiqadi.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const transport = this.config.get<string>('MAIL_TRANSPORT');

    if (transport === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT'),
        secure: this.config.get<boolean>('SMTP_SECURE'),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('SMTP transporter initialized');
    } else {
      this.logger.warn(
        "MAIL_TRANSPORT='console' — emails will be logged, not sent",
      );
    }
  }

  /**
   * Email tasdiqlash xati. Foydalanuvchi linkni bosgach,
   * frontend `/verify-email?token=...` sahifasiga tushadi va backend'ga so'rov yuboradi.
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.send({
      to,
      subject: 'Email manzilingizni tasdiqlang',
      text: `Email manzilingizni tasdiqlash uchun quyidagi havolaga o'ting:\n${link}\n\nHavola 24 soat amal qiladi.`,
      html: `
        <p>Salom!</p>
        <p>Email manzilingizni tasdiqlash uchun quyidagi havolaga bosing:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Havola 24 soat amal qiladi.</p>
      `,
    });
  }

  /**
   * Parolni tiklash xati. Tokenli link bilan parol-tiklash sahifasiga olib boradi.
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.send({
      to,
      subject: 'Parolni tiklash',
      text: `Parolni tiklash uchun quyidagi havolaga o'ting:\n${link}\n\nHavola 1 soat amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xatga e'tibor bermang.`,
      html: `
        <p>Salom!</p>
        <p>Parolni tiklash uchun quyidagi havolaga bosing:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Havola 1 soat amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xatga e'tibor bermang.</p>
      `,
    });
  }

  private async send(payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM');

    if (!this.transporter) {
      // Console rejim: butun xat tarkibini logga yozamiz, jumladan link ham.
      this.logger.log(
        `[CONSOLE MAIL]\nFrom: ${from}\nTo: ${payload.to}\nSubject: ${payload.subject}\n---\n${payload.text}\n---`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
    } catch (err) {
      // Email yuborish muvaffaqiyatsiz bo'lsa ham asosiy oqim (signUp/forgotPassword) buzilmasligi kerak —
      // logga yozamiz, lekin xato ko'tarmaymiz. Aks holda foydalanuvchi qayta ro'yxatdan o'ta olmaydi.
      this.logger.error(
        `Failed to send email to ${payload.to}: ${(err as Error).message}`,
      );
    }
  }
}
