import nodemailer from 'nodemailer';
import { MessagingProvider } from './MessagingProvider.js';
import logger from '../logger.js';
import { env } from '../../../config/env.js';

/**
 * Concrete SMTP Email Provider
 */
export class SMTPEmailProvider extends MessagingProvider {
  constructor(config = {}) {
    super('SMTPEmailProvider');
    this.host = config.host || env.SMTP_HOST;
    this.port = config.port || env.SMTP_PORT || 587;
    this.secure = config.secure ?? (this.port === 465);
    this.user = config.user || env.SMTP_USER;
    this.pass = config.pass || env.SMTP_PASS;
    this.from = config.from || env.SMTP_FROM || this.user;

    this.enabled = !!(this.host && this.user && this.pass);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.user,
          pass: this.pass,
        },
      });
    }
  }

  async send({ to, subject, body }) {
    if (!this.enabled) {
      logger.warn(
        `[SMTPEmailProvider] SMTP credentials missing or incomplete. Falling back to console dispatch.`
      );
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: subject || 'Al-Institute Notification',
        text: body,
        html: `<div dir="rtl" style="font-family: Tajawal, sans-serif;">${body}</div>`,
      });

      logger.info(`[SMTPEmailProvider] Email dispatched successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`[SMTPEmailProvider] Dispatched error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Concrete Mock Email Provider
 */
export class MockEmailProvider extends MessagingProvider {
  constructor() {
    super('MockEmailProvider');
  }

  async send({ to, subject, body }) {
    logger.info(
      `📧 [MockEmailProvider] To: ${to} | Subject: "${subject || 'none'}" | Body: "${body}"`
    );
    return { success: true, messageId: `mock-email-${crypto.randomUUID()}` };
  }
}
