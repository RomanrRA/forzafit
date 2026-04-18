import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'FitLog <no-reply@forzafit.myalfanews.com>';

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const from = this.config.get<string>('SMTP_FROM');
    if (from) this.fromAddress = from;

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP не настроен (SMTP_HOST/USER/PASS отсутствуют) — письма будут логироваться в консоль',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    this.logger.log(`SMTP transport инициализирован: ${host}:${port}`);
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const subject = 'Сброс пароля FitLog';
    const text = `Здравствуйте!\n\nВы запросили сброс пароля. Перейдите по ссылке, чтобы задать новый пароль:\n${resetUrl}\n\nСсылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.`;
    const html = `<p>Здравствуйте!</p><p>Вы запросили сброс пароля. Перейдите по ссылке, чтобы задать новый пароль:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>`;

    if (!this.transporter) {
      this.logger.log(`[DEV MAIL] to=${email} subject="${subject}" link=${resetUrl}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        text,
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset to ${email}: ${(err as Error).message}`);
    }
  }
}
