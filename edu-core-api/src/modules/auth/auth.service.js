import bcrypt from 'bcryptjs';

import { DEFAULT_ROLES } from './rbacBootstrap.js';
import Role from './role.model.js';
import { AuthError } from '../../shared/errors/AuthError.js';
import logger from '../../shared/services/logger.js';
import * as tokenService from '../../shared/services/tokenService.js';
import User from '../users/user.model.js';

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
    '+passwordHash loginAttempts lockUntil isActive deletedAt tokenVersion tenantId role mfaEnabled'
  );

  const genericErrorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

  if (!user) {
    // Perform dummy bcrypt comparison to neutralize timing attacks
    const dummyHash =
      '$2a$12$L7R58tV380uGjR0FzO/G9uyXgS6l1BWeW0LzBbe8Z.L78g3f8yv1i';
    await bcrypt.compare(password, dummyHash);

    logger.warn(`🛡️ [Auth] Login failed: User not found for email ${email}`);
    throw new AuthError(genericErrorMsg, 401);
  }

  if (user.isLocked) {
    logger.warn(`🛡️ [Auth] Login failed: Account is locked for email ${email}`);
    throw new AuthError(genericErrorMsg, 401);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment login attempts with exponential backoff for lock duration
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      // 5 attempts: 15 mins, 6 attempts: 30 mins, 7 attempts: 60 mins...
      const backoffMinutes = 15 * Math.pow(2, user.loginAttempts - 5);
      user.lockUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);
    }

    await user.save();

    logger.warn(
      `🛡️ [Auth] Login failed: Invalid password for email ${email} (Attempts: ${user.loginAttempts})`
    );
    throw new AuthError(genericErrorMsg, 401);
  }

  if (user.isActive === false || user.deletedAt) {
    logger.warn(
      `🛡️ [Auth] Login failed: Account is inactive/deleted for email ${email}`
    );
    throw new AuthError(genericErrorMsg, 401);
  }

  // Reset attempts on success
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // If Multi-Factor Authentication is enabled, issue partial gate-token instead of full credentials JWTs
  if (user.mfaEnabled) {
    const tempMfaToken = tokenService.signAccessToken(user);
    user.passwordHash = undefined;
    return {
      user,
      mfaRequired: true,
      mfaToken: tempMfaToken,
    };
  }

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
    roleDetails = await Role.findOne({
      tenantId: user.tenantId,
      key: user.role,
    });
  }

  let permissions = [];
  if (user.role === 'ADMIN') {
    const adminRole = DEFAULT_ROLES.find((r) => r.key === 'ADMIN');
    permissions = adminRole ? adminRole.permissions : [];
  } else {
    permissions = roleDetails ? roleDetails.permissions || [] : [];
  }

  return { permissions, roleDetails };
};
