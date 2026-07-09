import nodemailer from 'nodemailer';

import logger from './logger.js';
import { env } from '../../config/env.js';

/**
 * Real Email Adapter using Nodemailer
 */
class EmailAdapter {
  constructor() {
    this.name = 'EmailAdapter';
    this.enabled = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async send({ email, title, message }) {
    if (!this.enabled) {
      logger.warn(
        `[EmailAdapter] SMTP not configured. Would have sent to ${email}: [${title}] ${message}`
      );
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: email,
        subject: title,
        text: message,
        html: `<div dir="rtl">${message}</div>`,
      });

      logger.info(`[EmailAdapter] Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`[EmailAdapter] Error sending email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailAdapter();
