import Branch from './branch.model.js';
import Tenant from './tenant.model.js';
import TenantSettings from './tenantSettings.model.js';
import logger from '../../shared/services/logger.js';

/**
 * Bootstraps the default Tenant, TenantSettings, and Branch if they do not exist.
 * Also migrates any unlinked records to this default tenant and branch.
 */
export const bootstrapTenantAndBranch = async () => {
  try {
    // 1. Ensure Default Tenant Exists
    let tenant = await Tenant.findOne({ slug: 'alpha-institute' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Edu Center ERP (Alpha Institute)',
        slug: 'alpha-institute',
        isActive: true,
      });
      logger.info(`🏢 Default Tenant created: ${tenant.name}`);
    }

    // 2. Ensure Default TenantSettings Exist
    let settings = await TenantSettings.findOne({ tenantId: tenant._id });
    if (!settings) {
      settings = await TenantSettings.create({
        tenantId: tenant._id,
        instituteName: 'Edu Center ERP',
        brandColors: {
          primary: '#1E3A8A', // Deep blue
          secondary: '#D97706', // Gold/Amber
          accent: '#3B82F6', // Blue
        },
        theme: 'light',
        currency: 'KWD',
        timezone: 'Asia/Kuwait',
        locale: 'ar',
      });
      logger.info('⚙️ Default TenantSettings initialized.');
    }

    // 3. Ensure Default Branch Exists
    let branch = await Branch.findOne({ tenantId: tenant._id, name: 'الفرع الرئيسي' });
    if (!branch) {
      branch = await Branch.create({
        tenantId: tenant._id,
        name: 'الفرع الرئيسي',
        address: 'الكويت، حولي',
        phone: '+965 5086 6476',
        isActive: true,
      });
      logger.info(`📍 Default Branch created: ${branch.name}`);
    }

    // Ensure RBAC permissions and default roles exist for this tenant
    try {
      const { bootstrapRBAC } = await import('../auth/rbacBootstrap.js');
      await bootstrapRBAC(tenant._id);
    } catch (rbacErr) {
      logger.error(`⚠️ RBAC Bootstrap failed for tenant ${tenant._id}: ${rbacErr.message}`);
    }

    // 4. Backward Compatibility Auto-migration
    // Update any existing Users, Students, Teachers, Lessons, etc. that lack a tenantId or branchId
    const mongoose = (await import('mongoose')).default;
    const models = mongoose.modelNames();

    for (const modelName of models) {
      if (['Tenant', 'TenantSettings', 'Branch'].includes(modelName)) {
        continue;
      }

      const Model = mongoose.model(modelName);

      // Update models with tenantId if missing
      if (Model.schema.path('tenantId')) {
        const tenantResult = await Model.updateMany(
          { tenantId: { $exists: false } },
          { $set: { tenantId: tenant._id } }
        );
        if (tenantResult.modifiedCount > 0) {
          logger.info(`🩹 Migrated ${tenantResult.modifiedCount} ${modelName} records to Tenant: ${tenant.slug}`);
        }
      }

      // Update models with branchId if missing
      if (Model.schema.path('branchId')) {
        const branchResult = await Model.updateMany(
          { branchId: { $exists: false } },
          { $set: { branchId: branch._id } }
        );
        if (branchResult.modifiedCount > 0) {
          logger.info(`🩹 Migrated ${branchResult.modifiedCount} ${modelName} records to Branch: ${branch.name}`);
        }
      }
    }

    return { tenantId: tenant._id, branchId: branch._id };
  } catch (error) {
    logger.error(`❌ Failed to bootstrap tenant/branch architecture: ${error.message}`);
    throw error;
  }
};
