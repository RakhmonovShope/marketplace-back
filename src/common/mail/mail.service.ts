import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Email yuborish servis'i.
 *
 * Ikki rejimda ishlay oladi (MAIL_TRANSPORT env'i bilan):
 *  1) 'console' — harfni real yubormaydi, balki Logger orqali console'ga chiqaradi.
 *     Dev/local muhitda qulay: SMTP sozlash shart emas, link to'g'ridan-to'g'ri loglarda ko'rinadi.
 *  2) 'smtp'    — haqiqiy SMTP server orqali yuboradi (SMTP_HOST/PORT/USER/PASS).
 *
 * HTML kontent Handlebars template'lari orqali tayyorlanadi (templates/*.hbs).
 * Dizayn kod'dan ajratilgan: template'ni o'zgartirish uchun kodga tegish shart emas.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  // Layout + har bir email tanasi (body) bir marta kompilyatsiya qilinadi (cache).
  private layout: Handlebars.TemplateDelegate;
  private readonly bodyTemplates: Record<string, Handlebars.TemplateDelegate> =
    {};

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

    // Template'larni startup'da bir marta kompilyatsiya qilamiz (har xat uchun
    // qaytadan o'qib/kompilyatsiya qilmaslik — tezroq).
    this.layout = this.compileTemplate('layout.hbs');
    this.bodyTemplates['verify-email'] =
      this.compileTemplate('verify-email.hbs');
    this.bodyTemplates['reset-password'] =
      this.compileTemplate('reset-password.hbs');
    this.logger.log('Email templates compiled');
  }

  /**
   * Email tasdiqlash xati. Foydalanuvchi linkni bosgach,
   * frontend `/verify-email?token=...` sahifasiga tushadi va backend'ga so'rov yuboradi.
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Email manzilingizni tasdiqlang';

    await this.send({
      to,
      subject,
      text: `Email manzilingizni tasdiqlash uchun quyidagi havolaga o'ting:\n${link}\n\nHavola 24 soat amal qiladi.`,
      html: this.render('verify-email', subject, { link, expiresHours: 24 }),
    });
  }

  /**
   * Parolni tiklash xati. Tokenli link bilan parol-tiklash sahifasiga olib boradi.
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.get<string>('APP_BASE_URL');
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Parolni tiklash';

    await this.send({
      to,
      subject,
      text: `Parolni tiklash uchun quyidagi havolaga o'ting:\n${link}\n\nHavola 1 soat amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xatga e'tibor bermang.`,
      html: this.render('reset-password', subject, { link, expiresHours: 1 }),
    });
  }

  /** `.hbs` faylni o'qib, Handlebars template'iga kompilyatsiya qiladi. */
  private compileTemplate(file: string): Handlebars.TemplateDelegate {
    // __dirname runtime'da dist/common/mail ga ishora qiladi; .hbs fayllar
    // nest-cli "assets" sozlamasi orqali dist'ga ko'chiriladi.
    const fullPath = join(__dirname, 'templates', file);
    const source = readFileSync(fullPath, 'utf-8');
    return Handlebars.compile(source);
  }

  /**
   * Body template'ini render qilib, uni umumiy layout (brending, footer)
   * ichiga joylashtiradi va to'liq HTML qaytaradi.
   */
  private render(
    templateName: string,
    subject: string,
    context: Record<string, unknown>,
  ): string {
    const body = this.bodyTemplates[templateName](context);

    return this.layout({
      subject,
      body, // {{{body}}} — layout ichida escape qilinmasdan joylashtiriladi
      appName: this.config.get<string>('APP_NAME', 'Marketplace'),
      year: new Date().getFullYear(),
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

    // Diqqat: bu yerda xatoni YUTMAYMIZ — uni chaqiruvchiga uzatamiz.
    // Email queue (BullMQ) orqali yuborilganda, xato ko'tarilsa queue uni
    // avtomatik retry qiladi. To'g'ridan-to'g'ri chaqiruvchilar (resendVerification,
    // forgotPassword) esa xatoni o'zlari ushlab, oqimni buzmaydi.
    await this.transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }
}
