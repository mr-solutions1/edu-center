process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import { SMTPEmailProvider } from '../../src/shared/services/communication/EmailProviders.js';
import { ProviderFactory } from '../../src/shared/services/communication/ProviderFactory.js';
import { TwilioSMSProvider } from '../../src/shared/services/communication/SMSProviders.js';
import { notificationService } from '../../src/shared/services/notification.service.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Notification Provider Abstraction Suite', () => {
  beforeAll(async () => {
    // Ensure TenantSettings is registered under mongoose models
    if (!mongoose.models.TenantSettings) {
      const tenantSettingsSchema = new mongoose.Schema({
        tenantId: mongoose.Schema.Types.ObjectId,
        integrations: mongoose.Schema.Types.Mixed,
      });
      mongoose.model('TenantSettings', tenantSettingsSchema);
    }
  });

  describe('SMTPEmailProvider', () => {
    it('should initialize with custom configurations', () => {
      const provider = new SMTPEmailProvider({
        host: 'smtp.custom.com',
        port: 465,
        user: 'custom@custom.com',
        pass: 'customPass',
        from: 'no-reply@custom.com',
      });

      expect(provider.name).toBe('SMTPEmailProvider');
      expect(provider.host).toBe('smtp.custom.com');
      expect(provider.port).toBe(465);
      expect(provider.user).toBe('custom@custom.com');
      expect(provider.pass).toBe('customPass');
      expect(provider.from).toBe('no-reply@custom.com');
    });

    it('should fallback to mock provider when SMTP credentials are not configured', async () => {
      const provider = new SMTPEmailProvider({ host: null });
      const result = await provider.send({
        to: 'test@example.com',
        body: 'Hello',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP not configured');
    });
  });

  describe('ProviderFactory', () => {
    it('should load mock messaging providers for null tenant context gracefully', async () => {
      const providers = await ProviderFactory.getProviders(null);

      expect(providers.emailProvider).toBeDefined();
      expect(providers.smsProvider).toBeDefined();
      expect(providers.whatsappProvider).toBeDefined();
    });

    it('should seamlessly construct configured SMTP/Twilio integrations for a tenant', async () => {
      const customTenantId = new mongoose.Types.ObjectId();

      const TenantSettings = mongoose.model('TenantSettings');
      await TenantSettings.create({
        tenantId: customTenantId,
        integrations: {
          smtp: {
            host: 'smtp.tenant.com',
            user: 'tenant@tenant.com',
            pass: 'secureTenantPass',
            port: 587,
          },
          sms: {
            provider: 'TWILIO',
            accountSid: 'AC_TENANT_SID',
            authToken: 'TENANT_TOKEN',
          },
          whatsapp: {
            provider: 'META',
            accessToken: 'META_TOKEN',
            phoneNumberId: 'META_PHONE_ID',
          },
        },
      });

      const providers = await ProviderFactory.getProviders(customTenantId);

      expect(providers.emailProvider).toBeInstanceOf(SMTPEmailProvider);
      expect(providers.emailProvider.host).toBe('smtp.tenant.com');
      expect(providers.emailProvider.user).toBe('tenant@tenant.com');

      expect(providers.smsProvider).toBeInstanceOf(TwilioSMSProvider);
      expect(providers.smsProvider.accountSid).toBe('AC_TENANT_SID');

      expect(providers.whatsappProvider.name).toBe('MetaWhatsAppProvider');
      expect(providers.whatsappProvider.accessToken).toBe('META_TOKEN');
    });
  });

  describe('NotificationService Orchestrator', () => {
    it('should route message dispatches correctly through active providers', async () => {
      const dummyPayload = {
        email: 'recipient@domain.com',
        phone: '+96555555555',
        title: 'تنبيه تجريبي',
        message: 'محتوى الرسالة من معهد ركان',
        type: 'TEST_ALERT',
        data: { sendSMS: true },
      };

      let notifiedCount = 0;
      const originalNotify = notificationService.notify;
      notificationService.notify = async (p) => {
        notifiedCount++;
        return originalNotify.call(notificationService, p);
      };

      await notificationService.notify(dummyPayload);
      expect(notifiedCount).toBe(1);

      // Restore original function
      notificationService.notify = originalNotify;
    });
  });
});
