import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import * as authService from './auth.service.js';
import RefreshToken from './refreshToken.model.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';
import logger from '../../shared/services/logger.js';
import * as tokenService from '../../shared/services/tokenService.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { TOTPHelper } from '../../shared/utils/totp.js';
import User from '../users/user.model.js';

/**
 * Set refresh token in httpOnly cookie
 */
const setRefreshCookie = (res, token) => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
  const maxAge = days * 24 * 60 * 60 * 1000;

  // Modern browsers (Safari e.g. ITP, Brave, and Chrome) aggressively block SameSite=None
  // cookies as third-party trackers. Since alpha.flowship.site and alpha-api.flowship.site
  // share the same registrable domain (flowship.site), they are same-site.
  // Using SameSite=Lax with COOKIE_DOMAIN=.flowship.site ensures the cookie is securely stored
  // and transmitted across subdomains without being blocked by tracking protections!
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    domain: env.COOKIE_DOMAIN || undefined,
  });
};

/**
 * Clear refresh token cookie with security options
 */
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
  });
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const result = await authService.login(email, password, ipAddress, userAgent);

  const { user, accessToken, refreshToken, mfaRequired, mfaToken } = result;

  // If Multi-Factor Authentication is active, return gate parameters immediately
  if (mfaRequired) {
    logger.info(
      `🛡️ [Auth] MFA challenge required for user ${user._id}. Issuing temporary mfaToken.`
    );
    res.status(200).json({
      success: true,
      data: {
        mfaRequired: true,
        mfaToken,
      },
    });
    return;
  }

  setRefreshCookie(res, refreshToken);

  // Audit Log with Standardized Enterprise Security Framework
  req.user = user;
  await logAuditTrail(req, {
    action: 'LOGIN',
    entityType: 'User',
    entityId: user._id,
    afterState: { email: user.email, role: user.role },
  });

  const permissionsAndRole = await authService.getUserPermissionsAndRole(user);
  const userObj = user.toObject
    ? user.toObject()
    : JSON.parse(JSON.stringify(user));
  userObj.permissions = permissionsAndRole.permissions;
  userObj.roleDetails = permissionsAndRole.roleDetails;

  res.status(200).json({
    success: true,
    data: { user: userObj, accessToken },
  });
});

/**
 * @desc    Refresh tokens
 * @route   POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const reqId = req.headers['x-refresh-request-id'] || 'unknown';
  const tabId = req.headers['x-refresh-tab-id'] || 'unknown';

  logger.debug(
    `[Auth] Refresh requested. reqId: ${reqId}, tabId: ${tabId}, cookiePresent: ${!!refreshToken}`
  );

  try {
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await authService.refresh(refreshToken, ipAddress, userAgent);

    setRefreshCookie(res, newRefreshToken);

    logger.debug(`[Auth] Refresh success. reqId: ${reqId}, tabId: ${tabId}`);

    const permissionsAndRole =
      await authService.getUserPermissionsAndRole(user);
    const userObj = user.toObject
      ? user.toObject()
      : JSON.parse(JSON.stringify(user));
    userObj.permissions = permissionsAndRole.permissions;
    userObj.roleDetails = permissionsAndRole.roleDetails;

    res.status(200).json({
      success: true,
      data: { user: userObj, accessToken },
    });
  } catch (err) {
    logger.error(
      `[Auth] Refresh failed. reqId: ${reqId}, tabId: ${tabId}, status: ${err.statusCode || 401}, msg: ${err.message}`
    );
    throw err;
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      const tokenDoc = await RefreshToken.findOne({ tokenHash }).populate(
        'userId'
      );
      if (tokenDoc && tokenDoc.userId) {
        req.user = tokenDoc.userId;
        await logAuditTrail(req, {
          action: 'LOGOUT',
          entityType: 'User',
          entityId: tokenDoc.userId._id,
        });
      }
    } catch {
      // Ignore to ensure logout is completely self-healing and never blocks
    }
  }

  await authService.logout(refreshToken);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Logged out' });
});

/**
 * @desc    Logout from all sessions
 * @route   POST /api/v1/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req, res) => {
  await logAuditTrail(req, {
    action: 'LOGOUT_ALL',
    entityType: 'User',
    entityId: req.user._id,
  });

  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  res
    .status(200)
    .json({ success: true, message: 'Logged out from all devices' });
});

/**
 * @desc    Generate MFA configuration secret and QR provisioning URL
 * @route   POST /api/v1/auth/mfa/setup
 */
export const mfaSetup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  // Generate a random 160-bit base32 secret
  const tempSecret = TOTPHelper.generateSecret();
  const label = `${user.email}`;
  const issuer = 'Rakan Academy ERP';
  const otpauthUrl = TOTPHelper.generateOtpauthUrl(label, issuer, tempSecret);

  // Temporarily cache secret on the user document
  user.mfaTempSecret = tempSecret;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      secret: tempSecret,
      otpauthUrl,
    },
  });
});

/**
 * @desc    Validate first standard token and permanently enable MFA
 * @route   POST /api/v1/auth/mfa/enable
 */
export const mfaEnable = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId).select('+mfaTempSecret');
  if (!user || !user.mfaTempSecret) {
    throw new AppError('يرجى تهيئة إعدادات المصادقة الثنائية أولاً', 400);
  }

  // Verify the 6-digit TOTP token
  const isValid = TOTPHelper.verifyToken(user.mfaTempSecret, code);
  if (!isValid) {
    throw new AppError('رمز التحقق غير صحيح أو انتهت صلاحيته', 400);
  }

  // Atomically promote temporary secret to permanent
  user.mfaSecret = user.mfaTempSecret;
  user.mfaTempSecret = undefined;
  user.mfaEnabled = true;
  await user.save();

  await logAuditTrail(req, {
    action: 'MFA_ENABLED',
    entityType: 'User',
    entityId: user._id,
  });

  res.status(200).json({
    success: true,
    message: 'تم تفعيل المصادقة الثنائية (MFA) بنجاح وحماية حسابك',
  });
});

/**
 * @desc    Verify temporary MFA gate token and finalize login
 * @route   POST /api/v1/auth/mfa/verify
 */
export const mfaVerify = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (!mfaToken || !code) {
    throw new AppError('البيانات المطلوبة مفقودة', 400);
  }

  // 1. Decode and verify temporary mfaToken
  let decoded;
  try {
    decoded = jwt.verify(mfaToken, env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError(
      'انتهت صلاحية رمز الجلسة المؤقت، يرجى إعادة تسجيل الدخول',
      401
    );
  }

  // 2. Fetch target user and their select secret
  const user = await User.findById(decoded.id).select(
    '+mfaSecret +passwordHash loginAttempts lockUntil isActive deletedAt tokenVersion tenantId role'
  );
  if (!user || !user.mfaSecret) {
    throw new AppError('إعدادات الحساب غير صالحة', 401);
  }

  // 3. Verify standard 6-digit code
  const isValid = TOTPHelper.verifyToken(user.mfaSecret, code);
  if (!isValid) {
    throw new AppError('رمز التحقق غير صحيح أو انتهت صلاحيته', 401);
  }

  // 4. Issue full operational access and refresh tokens
  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.signRefreshToken(
    user._id,
    null,
    ipAddress,
    userAgent
  );

  setRefreshCookie(res, refreshToken);

  // Record audit trail
  req.user = user;
  await logAuditTrail(req, {
    action: 'LOGIN_MFA_SUCCESS',
    entityType: 'User',
    entityId: user._id,
  });

  const permissionsAndRole = await authService.getUserPermissionsAndRole(user);
  const userObj = user.toObject
    ? user.toObject()
    : JSON.parse(JSON.stringify(user));
  userObj.permissions = permissionsAndRole.permissions;
  userObj.roleDetails = permissionsAndRole.roleDetails;

  res.status(200).json({
    success: true,
    data: {
      user: userObj,
      accessToken,
    },
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  const permissionsAndRole = await authService.getUserPermissionsAndRole(user);
  const userObj = user.toObject
    ? user.toObject()
    : JSON.parse(JSON.stringify(user));
  userObj.permissions = permissionsAndRole.permissions;
  userObj.roleDetails = permissionsAndRole.roleDetails;

  res.status(200).json({ success: true, data: userObj });
});

/**
 * @desc    Get active sessions
 * @route   GET /api/v1/auth/sessions
 */
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await RefreshToken.find({
    userId: req.user.id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('ipAddress userAgent createdAt');

  res.status(200).json({ success: true, data: sessions });
});

/**
 * @desc    Revoke a specific session
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 */
export const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await RefreshToken.findOne({
    _id: sessionId,
    userId: req.user.id,
  });

  if (!session) {
    return res
      .status(404)
      .json({ success: false, message: 'Session not found' });
  }

  session.revokedAt = new Date();
  await session.save();

  return res.status(200).json({ success: true, message: 'Session revoked' });
});
