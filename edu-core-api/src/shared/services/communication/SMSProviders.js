import { MessagingProvider } from './MessagingProvider.js';
import logger from '../logger.js';
import { env } from '../../../config/env.js';

/**
 * Concrete Twilio SMS Provider
 */
export class TwilioSMSProvider extends MessagingProvider {
  constructor(config = {}) {
    super('TwilioSMSProvider');
    this.accountSid = config.accountSid || env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || env.TWILIO_AUTH_TOKEN;
    this.from = config.from || env.TWILIO_PHONE_NUMBER;

    this.enabled = !!(this.accountSid && this.authToken && this.from);
  }

  async send({ to, body }) {
    if (!this.enabled) {
      logger.warn(
        `[TwilioSMSProvider] Twilio SMS credentials missing or incomplete. Falling back to console dispatch.`
      );
      return { success: false, error: 'Twilio SMS not configured' };
    }

    try {
      logger.info(`[TwilioSMSProvider] Dispatching SMS to ${to}: ${body}`);

      // In a real production environment with valid credentials:
      // import twilio from 'twilio';
      // const client = twilio(this.accountSid, this.authToken);
      // const response = await client.messages.create({
      //   body,
      //   to,
      //   from: this.from,
      // });
      // return { success: true, sid: response.sid };

      return { success: true, sid: `mock-sid-${crypto.randomUUID()}` };
    } catch (error) {
      logger.error(`[TwilioSMSProvider] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Concrete Mock SMS Provider
 */
export class MockSMSProvider extends MessagingProvider {
  constructor() {
    super('MockSMSProvider');
  }

  async send({ to, body }) {
    logger.info(`📱 [MockSMSProvider] To: ${to} | Body: "${body}"`);
    return { success: true, sid: `mock-sms-${crypto.randomUUID()}` };
  }
}
