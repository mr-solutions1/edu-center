import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import RefreshToken from '../../modules/auth/refreshToken.model.js';
import { AuthError } from '../errors/AuthError.js';

/**
 * Hash a token using SHA-256
 * @param {string} token
 * @returns {string}
 */
const hashToken = (token) => {
  if (!token) {
    throw new Error('Refresh token is required for hashing');
  }
  if (typeof token !== 'string') {
    throw new Error(`Invalid token type: ${typeof token}`);
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Sign an Access Token
 * @param {object} user
 * @returns {string}
 */
export const signAccessToken = (user) => {
  const tokenVersion = typeof user?.tokenVersion === 'number' ? user.tokenVersion : 0;
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
};

/**
 * Sign a Refresh Token and save its hash to the database
 * @param {string} userId
 * @param {string} family - Rotation family ID
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<string>} raw token
 */
export const signRefreshToken = async (
  userId,
  family = null,
  ipAddress = null,
  userAgent = null
) => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const refreshTokenFamily = family || crypto.randomUUID();

  // Parse expiresAt from env (e.g., '7d')
  const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await RefreshToken.create({
    userId,
    tokenHash,
    family: refreshTokenFamily,
    ipAddress,
    userAgent,
    expiresAt,
  });

  return token;
};

/**
 * Verify Access Token
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthError('انتهت صلاحية جلسة العمل', 401, 'TOKEN_EXPIRED');
    }
    throw new AuthError('رمز وصول غير صالح', 401, 'INVALID_TOKEN');
  }
};

/**
 * Rotate Refresh Token
 * @param {string} rawToken
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<object>} { accessToken, refreshToken, user }
 */
export const rotateRefreshToken = async (rawToken, ipAddress, userAgent) => {
  if (!rawToken) {
    throw new AuthError('رمز التحديث مطلوب', 401, 'REFRESH_TOKEN_REQUIRED');
  }
  const tokenHash = hashToken(rawToken);

  const tokenDoc = await RefreshToken.findOne({ tokenHash }).populate('userId');

  console.info('[BACKEND_TOKEN_ROTATION_START] ' + JSON.stringify({
    timestamp: new Date().toISOString(),
    tokenHash,
    tokenFound: !!tokenDoc,
    family: tokenDoc?.family,
    revokedAt: tokenDoc?.revokedAt,
    expiresAt: tokenDoc?.expiresAt,
  }, null, 2));

  if (!tokenDoc) {
    throw new AuthError('رمز تحديث غير صالح', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Reuse detection: if token is already revoked, revoke the whole family
  if (tokenDoc.revokedAt) {
    console.error('[BACKEND_TOKEN_REUSE_DETECTED] ' + JSON.stringify({
      timestamp: new Date().toISOString(),
      tokenHash,
      family: tokenDoc.family,
      revokedAt: tokenDoc.revokedAt,
    }, null, 2));

    await RefreshToken.updateMany(
      { family: tokenDoc.family },
      { revokedAt: new Date() }
    );
    throw new AuthError(
      'تم اكتشاف محاولة إعادة استخدام الرمز. يرجى تسجيل الدخول مرة أخرى.',
      401,
      'REFRESH_TOKEN_REUSE'
    );
  }

  // Revoke current token
  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();

  const user = tokenDoc.userId;
  if (!user || !user.isActive || user.deletedAt) {
    throw new AuthError('المستخدم غير موجود أو غير نشط', 401, 'USER_INACTIVE');
  }

  // Issue new tokens
  const accessToken = signAccessToken(user);
  const refreshToken = await signRefreshToken(
    user._id,
    tokenDoc.family,
    ipAddress,
    userAgent
  );

  console.info('[BACKEND_TOKEN_ROTATION_SUCCESS] ' + JSON.stringify({
    timestamp: new Date().toISOString(),
    family: tokenDoc.family,
    newHash: hashToken(refreshToken),
  }, null, 2));

  return { accessToken, refreshToken, user };
};

/**
 * Revoke a specific Refresh Token
 * @param {string} rawToken
 */
export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
};

/**
 * Revoke all Refresh Tokens for a user
 * @param {string} userId
 */
export const revokeAllUserTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};
