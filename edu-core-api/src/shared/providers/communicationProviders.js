import logger from '../services/logger.js';

/**
 * Abstract Email Provider Contract
 */
export class EmailProvider {
  async sendEmail({ to, subject, html }) {
    throw new Error('Method "sendEmail" must be implemented');
  }
}

/**
 * Concrete Console/Mock Email Adapter (Extensible to AWS SES / SendGrid)
 */
class MockEmailProvider extends EmailProvider {
  async sendEmail({ to, subject, html }) {
    logger.info(`📧 [EmailProvider] Dispatching email to: ${to} | Subject: "${subject}"`);
    return { success: true, messageId: crypto.randomUUID() };
  }
}

/**
 * Abstract SMS Provider Contract
 */
export class SMSProvider {
  async sendSMS({ to, body }) {
    throw new Error('Method "sendSMS" must be implemented');
  }
}

/**
 * Concrete Mock SMS Adapter (Extensible to Twilio / Local Kuwait Gateways)
 */
class MockSMSProvider extends SMSProvider {
  async sendSMS({ to, body }) {
    logger.info(`📱 [SMSProvider] Dispatching SMS alert to: ${to} | Body: "${body}"`);
    return { success: true, sid: crypto.randomUUID() };
  }
}

/**
 * Abstract WhatsApp Provider Contract
 */
export class WhatsAppProvider {
  async sendWhatsApp({ to, body, templateName, variables }) {
    throw new Error('Method "sendWhatsApp" must be implemented');
  }
}

/**
 * Concrete Mock WhatsApp Adapter (Extensible to WhatsApp Business API)
 */
class MockWhatsAppProvider extends WhatsAppProvider {
  async sendWhatsApp({ to, body, templateName, variables }) {
    logger.info(`💬 [WhatsAppProvider] Dispatching WhatsApp alert to: ${to} | Template: "${templateName || 'none'}"`);
    return { success: true, messageId: crypto.randomUUID() };
  }
}

// Global active providers (Configured as Mocks by default, easy to wire up real gateways)
export const emailProvider = new MockEmailProvider();
export const smsProvider = new MockSMSProvider();
export const whatsappProvider = new MockWhatsAppProvider();
