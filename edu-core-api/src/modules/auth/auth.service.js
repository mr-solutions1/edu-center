import { AuthError } from '../../shared/errors/AuthError.js';
import * as tokenService from '../../shared/services/tokenService.js';
import User from '../users/user.model.js';
import Role from './role.model.js';
import { DEFAULT_ROLES } from './rbacBootstrap.js';

/**
 * Login user
 * @param {string} email
 * @param {string} password
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<object>} { user, accessToken, refreshToken }
 */
export const login = async (email, password, ipAddress, userAgent) => {
  const user = await User.findOne({ email }).select(
    '+passwordHash loginAttempts lockUntil isActive deletedAt'
  );

  if (!user) {
    throw new AuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  if (user.isLocked) {
    throw new AuthError(
      'تم قفل الحساب مؤقتاً بسبب محاولات دخول خاطئة، يرجى المحاولة لاحقاً',
      401
    );
  }

  if (!(await user.comparePassword(password))) {
    // Increment login attempts with exponential backoff for lock duration
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      // 5 attempts: 15 mins, 6 attempts: 30 mins, 7 attempts: 60 mins...
      const backoffMinutes = 15 * Math.pow(2, user.loginAttempts - 5);
      user.lockUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);
    }

    await user.save();
    throw new AuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  if (user.isActive === false || user.deletedAt) {
    throw new AuthError('هذا الحساب غير نشط', 401);
  }

  // Reset attempts on success
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.signRefreshToken(
    user._id,
    null,
    ipAddress,
    userAgent
  );

  // Remove password from output
  user.passwordHash = undefined;

  return { user, accessToken, refreshToken };
};

/**
 * Refresh tokens
 * @param {string} refreshToken
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<object>}
 */
export const refresh = async (refreshToken, ipAddress, userAgent) => {
  return tokenService.rotateRefreshToken(refreshToken, ipAddress, userAgent);
};

/**
 * Logout user from current session
 * @param {string} refreshToken
 */
export const logout = async (refreshToken) => {
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
};

/**
 * Logout user from all sessions
 * @param {string} userId
 */
export const logoutAll = async (userId) => {
  await tokenService.revokeAllUserTokens(userId);
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

/**
 * Get user by ID
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AuthError('المستخدم غير موجود أو غير نشط', 401);
  }
  return user;
};

/**
 * Retrieve permissions and role details for a user
 * @param {object} user
 * @returns {Promise<object>} { permissions: string[], roleDetails: object|null }
 */
export const getUserPermissionsAndRole = async (user) => {
  if (!user) {
    return { permissions: [], roleDetails: null };
  }

  let roleDetails = null;
  if (user.roleId) {
    roleDetails = await Role.findById(user.roleId);
  } else if (user.role) {
    roleDetails = await Role.findOne({ tenantId: user.tenantId, key: user.role });
  }

  let permissions = [];
  if (user.role === 'ADMIN') {
    const adminRole = DEFAULT_ROLES.find((r) => r.key === 'ADMIN');
    permissions = adminRole ? adminRole.permissions : [];
  } else {
    permissions = roleDetails ? (roleDetails.permissions || []) : [];
  }

  return { permissions, roleDetails };
};
