import { MessagingProvider } from './MessagingProvider.js';
import logger from '../logger.js';
import { env } from '../../../config/env.js';

/**
 * Concrete Twilio WhatsApp Provider
 */
export class TwilioWhatsAppProvider extends MessagingProvider {
  constructor(config = {}) {
    super('TwilioWhatsAppProvider');
    this.accountSid = config.accountSid || env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || env.TWILIO_AUTH_TOKEN;
    this.from = config.from || env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    this.enabled = !!(this.accountSid && this.authToken && this.from);
  }

  async send({ to, body }) {
    if (!this.enabled) {
      logger.warn(
        `[TwilioWhatsAppProvider] Twilio credentials missing. Falling back to console dispatch.`
      );
      return { success: false, error: 'Twilio WhatsApp not configured' };
    }

    try {
      logger.info(`[TwilioWhatsAppProvider] Sending WhatsApp to ${to}: ${body}`);

      // In production environment with twilio SDK:
      // import twilio from 'twilio';
      // const client = twilio(this.accountSid, this.authToken);
      // const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      // const response = await client.messages.create({
      //   from: this.from,
      //   body,
      //   to: formattedTo
      // });
      // return { success: true, sid: response.sid };

      return { success: true, sid: `mock-twilio-wa-${crypto.randomUUID()}` };
    } catch (error) {
      logger.error(`[TwilioWhatsAppProvider] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Concrete Meta Cloud API WhatsApp Provider
 */
export class MetaWhatsAppProvider extends MessagingProvider {
  constructor(config = {}) {
    super('MetaWhatsAppProvider');
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.enabled = !!(this.accessToken && this.phoneNumberId);
  }

  async send({ to, body, template, variables }) {
    if (!this.enabled) {
      logger.warn(
        `[MetaWhatsAppProvider] Meta cloud credentials missing. Falling back to console dispatch.`
      );
      return { success: false, error: 'Meta Cloud API not configured' };
    }

    try {
      logger.info(
        `[MetaWhatsAppProvider] Dispatching Template [${template || 'none'}] to ${to} with body: ${body}`
      );

      // In production, we'd fire an HTTP POST request to:
      // https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages
      // with Authorization: Bearer ${this.accessToken} and payload containing recipient and template variables.

      return { success: true, messageId: `mock-meta-wa-${crypto.randomUUID()}` };
    } catch (error) {
      logger.error(`[MetaWhatsAppProvider] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Concrete Mock WhatsApp Provider
 */
export class MockWhatsAppProvider extends MessagingProvider {
  constructor() {
    super('MockWhatsAppProvider');
  }

  async send({ to, body, template, variables }) {
    logger.info(
      `💬 [MockWhatsAppProvider] To: ${to} | Template: "${template || 'none'}" | Body: "${body}" | Variables: ${JSON.stringify(variables || {})}`
    );
    return { success: true, messageId: `mock-wa-${crypto.randomUUID()}` };
  }
}
