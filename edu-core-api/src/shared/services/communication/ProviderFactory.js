import mongoose from 'mongoose';
import logger from '../logger.js';

import { SMTPEmailProvider, MockEmailProvider } from './EmailProviders.js';

import { TwilioSMSProvider, MockSMSProvider } from './SMSProviders.js';

import {
  TwilioWhatsAppProvider,
  MetaWhatsAppProvider,
  MockWhatsAppProvider,
} from './WhatsAppProviders.js';

/**
 * Dynamic Multi-Tenant Provider Factory
 */
export class ProviderFactory {
  /**
   * Resolves active email, SMS, and WhatsApp providers for a specific tenant.
   * @param {string|ObjectId} [tenantId] - Optional tenant identifier
   * @returns {Promise<{ emailProvider: MessagingProvider, smsProvider: MessagingProvider, whatsappProvider: MessagingProvider }>}
   */
  static async getProviders(tenantId = null) {
    let settings = null;

    if (tenantId) {
      try {
        const TenantSettings = mongoose.model('TenantSettings');
        settings = await TenantSettings.findOne({ tenantId });
      } catch (err) {
        logger.error(
          `[ProviderFactory] Failed to fetch settings for tenant ${tenantId}: ${err.message}`
        );
      }
    }

    const integrations = settings?.integrations || {};

    // 1. Resolve Email Provider
    let emailProvider;
    const smtpConfig = integrations.smtp || {};
    if (smtpConfig.host && smtpConfig.user) {
      emailProvider = new SMTPEmailProvider(smtpConfig);
    } else {
      // Fallback to system-wide SMTPEmailProvider
      const systemSmtp = new SMTPEmailProvider();
      emailProvider = systemSmtp.enabled ? systemSmtp : new MockEmailProvider();
    }

    // 2. Resolve SMS Provider
    let smsProvider;
    const smsConfig = integrations.sms || {};
    if (smsConfig.provider === 'TWILIO' && smsConfig.accountSid) {
      smsProvider = new TwilioSMSProvider(smsConfig);
    } else {
      // Fallback to system-wide TwilioSMSProvider
      const systemSms = new TwilioSMSProvider();
      smsProvider = systemSms.enabled ? systemSms : new MockSMSProvider();
    }

    // 3. Resolve WhatsApp Provider
    let whatsappProvider;
    const waConfig = integrations.whatsapp || {};
    if (waConfig.provider === 'META' && waConfig.accessToken) {
      whatsappProvider = new MetaWhatsAppProvider(waConfig);
    } else if (waConfig.provider === 'TWILIO' && waConfig.accountSid) {
      whatsappProvider = new TwilioWhatsAppProvider(waConfig);
    } else {
      // Fallback to system-wide TwilioWhatsAppProvider
      const systemWa = new TwilioWhatsAppProvider();
      whatsappProvider = systemWa.enabled
        ? systemWa
        : new MockWhatsAppProvider();
    }

    return {
      emailProvider,
      smsProvider,
      whatsappProvider,
    };
  }
}
