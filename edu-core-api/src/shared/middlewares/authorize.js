import Role from '../../modules/auth/role.model.js';
import { ForbiddenError } from '../errors/ForbiddenError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
 * Checks if the user's dynamic role has the required permission key.
 *
 * @param {string} permissionKey The unique key of the permission (e.g. 'student.create')
 */
export const hasPermission = (permissionKey) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) {
      throw new ForbiddenError('المستخدم غير مصرح له');
    }

    // 1. System administrators (ADMIN) bypassed or loaded with full permissions
    if (user.role === 'ADMIN') {
      return next();
    }

    // 2. Fetch the user's dynamic role from database
    let role = null;
    if (user.roleId) {
      role = await Role.findById(user.roleId);
    } else if (user.role) {
      role = await Role.findOne({ tenantId: user.tenantId, key: user.role });
    }

    if (!role) {
      throw new ForbiddenError('لم يتم العثور على صلاحيات معرّفة لهذا الحساب');
    }

    // 3. Check if the permission key is in the role's permissions list
    const isAuthorized = role.permissions && role.permissions.includes(permissionKey);
    if (!isAuthorized) {
      throw new ForbiddenError(`ليس لديك الصلاحية المطلوبة للقيام بهذا الإجراء: (${permissionKey})`);
    }

    next();
  });
};
