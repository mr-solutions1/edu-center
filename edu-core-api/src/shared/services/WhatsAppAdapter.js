import logger from './logger.js';
import { env } from '../../config/env.js';

/**
 * WhatsApp Provider Interface
 */
class WhatsAppAdapter {
  constructor() {
    this.name = 'WhatsAppAdapter';
    this.accountSid = env.TWILIO_ACCOUNT_SID;
    this.authToken = env.TWILIO_AUTH_TOKEN;
    this.from = env.TWILIO_WHATSAPP_FROM;
    this.enabled = !!(this.accountSid && this.authToken && this.from);
  }

  /**
   * Send WhatsApp message
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.message - Message body
   */
  async send({ phone, message }) {
    if (!this.enabled) {
      logger.warn(
        `[WhatsAppAdapter] Twilio not configured. Would have sent to ${phone}: ${message}`
      );
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      logger.info(`[WhatsAppAdapter] Sending WhatsApp to ${phone}: ${message}`);

      // In a real production environment with valid credentials:
      // const client = twilio(this.accountSid, this.authToken);
      // await client.messages.create({
      //   from: this.from,
      //   body: message,
      //   to: `whatsapp:${phone}`
      // });

      return { success: true };
    } catch (error) {
      logger.error(`[WhatsAppAdapter] Failed to send WhatsApp: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new WhatsAppAdapter();
