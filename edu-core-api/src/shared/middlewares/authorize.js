import mongoose from 'mongoose';

import Role from '../../modules/auth/role.model.js';
import { ForbiddenError } from '../errors/ForbiddenError.js';
import logger from '../services/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Mapping permissions to their corresponding SaaS Feature Flags inside TenantSettings
 */
const PERMISSION_FEATURE_FLAGS = {
  'crm.view': 'crmEnabled',
  'crm.manage': 'crmEnabled',
  'exams.view': 'examsEnabled',
  'exams.manage': 'examsEnabled',
};

/**
 * Recursively resolves if a role has a permission directly or through inheritance
 * @param {Object} role - Mongoose Role document
 * @param {string} permissionKey - Unique permission key
 * @param {Set<string>} [visited] - Set of visited role keys to prevent infinite loops in bad configs
 * @returns {Promise<boolean>}
 */
const resolveRolePermission = async (
  role,
  permissionKey,
  visited = new Set()
) => {
  if (!role) {
    return false;
  }

  // Direct check
  if (role.permissions && role.permissions.includes(permissionKey)) {
    return true;
  }

  // Prevent infinite loops if role inheritance is circular
  if (visited.has(role.key)) {
    return false;
  }
  visited.add(role.key);

  // Check inherited roles recursively
  if (role.inherits && role.inherits.length > 0) {
    for (const parentKey of role.inherits) {
      const parentRole = await Role.findOne({
        tenantId: role.tenantId,
        key: parentKey,
      });
      if (parentRole) {
        const hasInherited = await resolveRolePermission(
          parentRole,
          permissionKey,
          visited
        );
        if (hasInherited) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Verifies if the feature flag associated with a permission is active for this tenant
 * @param {string} tenantId - Tenant identifier
 * @param {string} permissionKey - Permission key
 * @returns {Promise<boolean>} True if the feature is enabled (or if no flag is bound)
 */
const verifyFeatureFlag = async (tenantId, permissionKey) => {
  const boundFlag = PERMISSION_FEATURE_FLAGS[permissionKey];
  if (!boundFlag || !tenantId) {
    return true;
  }

  try {
    const TenantSettings = mongoose.model('TenantSettings');
    const settings = await TenantSettings.findOne({ tenantId });
    if (settings && settings.featureFlags) {
      // Returns true if the flag is enabled (defaulting to true if not explicitly set)
      return settings.featureFlags[boundFlag] !== false;
    }
  } catch (err) {
    logger.error(`[authorize] Feature flag check failed: ${err.message}`);
  }

  return true;
};

/**
 * Authorize static roles (Backward Compatibility)
 * @param  {...string} roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('ليس لديك صلاحية للقيام بهذا الإجراء'));
      return;
    }
    next();
  };
};

/**
 * Dynamic Permission Middleware
 * Checks if the user's dynamic role has the required permission key, supporting inheritance and feature flags.
 *
 * @param {string} permissionKey The unique key of the permission (e.g. 'student.create')
 */
export const hasPermission = (permissionKey) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) {
      throw new ForbiddenError('المستخدم غير مصرح له');
    }

    // 1. Enforce SaaS Feature Flags gating first
    const isFeatureActive = await verifyFeatureFlag(
      user.tenantId,
      permissionKey
    );
    if (!isFeatureActive) {
      throw new ForbiddenError(
        `هذه الميزة معطّلة حالياً ضمن باقة اشتراك المعهد`
      );
    }

    // 2. System administrators (ADMIN) bypassed with full access
    if (user.role === 'ADMIN') {
      next();
      return;
    }

    // 3. Fetch user dynamic role
    let role = null;
    if (user.roleId) {
      role = await Role.findById(user.roleId);
    } else if (user.role) {
      role = await Role.findOne({ tenantId: user.tenantId, key: user.role });
    }

    if (!role) {
      throw new ForbiddenError('لم يتم العثور على صلاحيات معرّفة لهذا الحساب');
    }

    // 4. Resolve permission with dynamic inheritance support
    const isAuthorized = await resolveRolePermission(role, permissionKey);
    if (!isAuthorized) {
      throw new ForbiddenError(
        `ليس لديك الصلاحية المطلوبة للقيام بهذا الإجراء: (${permissionKey})`
      );
    }

    next();
  });
};

/**
 * Attribute-Based Access Control (ABAC) Policy Middleware
 * Integrates dynamic permission checks with dynamic contextual attributes (e.g., branch boundaries, record ownership).
 *
 * @param {string} permissionKey - Unique permission key
 * @param {Function} policyEvaluator - ABAC callback callback function taking (req, user) and returning a boolean
 */
export const hasPermissionWithPolicy = (permissionKey, policyEvaluator) => {
  return asyncHandler(async (req, res, next) => {
    // 1. Perform core permission check first
    await new Promise((resolve, reject) => {
      hasPermission(permissionKey)(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // System administrators (ADMIN) bypass ABAC rules
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // 2. Evaluate context-based ABAC policy
    const isPolicySatisfied = await policyEvaluator(req, req.user);
    if (!isPolicySatisfied) {
      throw new ForbiddenError(
        'تم حظر الوصول: لا تطابق قيود السياسة السياقية (ABAC)'
      );
    }

    next();
  });
};
export default authorize;
