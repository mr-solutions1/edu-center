import TenantSettings from '../../modules/tenants/tenantSettings.model.js';
import { ForbiddenError } from '../errors/ForbiddenError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * SaaS Feature Flag Verification Middleware
 * Validates that a specific module or capability is licensed and active for the requester's tenant.
 *
 * @param {string} flagName The key of the feature flag (e.g. 'crmEnabled', 'aiAssistantEnabled')
 */
export const checkFeatureFlag = (flagName) => {
  return asyncHandler(async (req, res, next) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return next(); // Pass if no tenant context is established (e.g. in public setup)
    }

    // Load settings for the tenant
    const settings = await TenantSettings.findOne({ tenantId });
    if (!settings) {
      throw new ForbiddenError('لم يتم تهيئة إعدادات وتراخيص المؤسسة التعليمية الخاصة بك');
    }

    const isFeatureEnabled = settings.featureFlags && settings.featureFlags[flagName];
    if (!isFeatureEnabled) {
      throw new ForbiddenError('هذه الميزة غير مفعلة في اشتراك معهدكم الحالي. يرجى التواصل مع الإدارة للترقية.');
    }

    next();
  });
};

export default checkFeatureFlag;
