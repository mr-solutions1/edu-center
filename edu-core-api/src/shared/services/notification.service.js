import logger from './logger.js';
import User from '../../modules/users/user.model.js';
import { ProviderFactory } from './communication/ProviderFactory.js';

/**
 * Enterprise Pluggable Multi-Tenant Notification Service
 */
class NotificationService {
  constructor() {
    this.adapters = [];

    // Register standard console fallback for testing / development
    this.registerAdapter({
      name: 'ConsoleAdapter',
      send: async (p) => {
        logger.info(
          `[ConsoleAdapter] Destination: ${p.userId || p.phone || p.email} | Title: "${p.title}" | Body: "${p.message}"`
        );
        return { success: true };
      },
    });
  }

  /**
   * Add an additional delivery channel adapter dynamically
   * @param {Object} adapter
   */
  registerAdapter(adapter) {
    this.adapters.push(adapter);
  }

  /**
   * Send notification through dynamically resolved, tenant-configured messaging providers
   * @param {Object} payload
   */
  async notify(payload) {
    const { userId, title, message, type, tenantId, data = {} } = payload;

    logger.info(`Notification triggered for user ${userId || 'unknown'}: "${title}"`);

    // 1. Fetch user context for contact coordinates if not directly supplied in payload
    const contactInfo = { email: payload.email, phone: payload.phone };
    let activeTenantId = tenantId || null;

    if (userId && (!contactInfo.email || !contactInfo.phone || !activeTenantId)) {
      try {
        const user = await User.findById(userId).select('email phone tenantId');
        if (user) {
          contactInfo.email = contactInfo.email || user.email;
          contactInfo.phone = contactInfo.phone || user.phone;
          activeTenantId = activeTenantId || user.tenantId;
        }
      } catch (err) {
        logger.error(`[NotificationService] Failed to retrieve user details: ${err.message}`);
      }
    }

    // 2. Resolve active providers dynamically from the Tenant settings (with global env defaults)
    let providers;
    try {
      providers = await ProviderFactory.getProviders(activeTenantId);
    } catch (err) {
      logger.error(`[NotificationService] Failed to load provider factory for tenant ${activeTenantId}: ${err.message}`);
      // Fallback to safe default mocks
      providers = await ProviderFactory.getProviders(null);
    }

    const { emailProvider, smsProvider, whatsappProvider } = providers;

    // 3. Coordinate dispatches concurrently
    const dispatchPromises = [];

    // Trigger Email dispatch if recipient address is available
    if (contactInfo.email) {
      dispatchPromises.push(
        emailProvider.send({
          to: contactInfo.email,
          subject: title,
          body: message,
          template: type,
          variables: data,
        }).then(res => ({ name: emailProvider.name, type: 'EMAIL', result: res }))
      );
    }

    // Trigger WhatsApp dispatch if recipient phone number is available
    if (contactInfo.phone) {
      dispatchPromises.push(
        whatsappProvider.send({
          to: contactInfo.phone,
          subject: title,
          body: message,
          template: type,
          variables: data,
        }).then(res => ({ name: whatsappProvider.name, type: 'WHATSAPP', result: res }))
      );

      // Trigger optional SMS dispatch if configured or requested specifically
      if (data.sendSMS) {
        dispatchPromises.push(
          smsProvider.send({
            to: contactInfo.phone,
            subject: title,
            body: message,
            template: type,
            variables: data,
          }).then(res => ({ name: smsProvider.name, type: 'SMS', result: res }))
        );
      }
    }

    // Also dispatch through registered secondary console/logging adapters (retains legacy registration behaviors)
    this.adapters.forEach((adapter) => {
      if (adapter.name !== 'ConsoleAdapter') {
        dispatchPromises.push(
          adapter.send({
            userId,
            title,
            message,
            type,
            email: contactInfo.email,
            phone: contactInfo.phone,
            data,
          }).then(res => ({ name: adapter.name, type: 'CUSTOM_ADAPTER', result: res }))
        );
      }
    });

    const results = await Promise.allSettled(dispatchPromises);

    results.forEach((res) => {
      if (res.status === 'rejected') {
        logger.error(`[NotificationService] Delivery dispatch failed: ${res.reason}`);
      } else {
        const { name, type: mode, result } = res.value;
        if (result && result.success === false) {
          logger.warn(`[NotificationService] Provider ${name} (${mode}) failed: ${result.error}`);
        } else {
          logger.info(`[NotificationService] Provider ${name} (${mode}) dispatched successfully.`);
        }
      }
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
