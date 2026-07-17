import crypto from 'crypto';
import * as authService from './auth.service.js';
import RefreshToken from './refreshToken.model.js';
import { env } from '../../config/env.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';
import logger from '../../shared/services/logger.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

/**
 * Set refresh token in httpOnly cookie
 */
const setRefreshCookie = (res, token) => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
  const maxAge = days * 24 * 60 * 60 * 1000;

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
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
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
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

  const { user, accessToken, refreshToken } = await authService.login(
    email,
    password,
    ipAddress,
    userAgent
  );

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
  const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
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
  const source = req.headers['x-refresh-source'] || 'unknown';

  logger.debug(`[Auth] Refresh requested. reqId: ${reqId}, tabId: ${tabId}, cookiePresent: ${!!refreshToken}`);

  try {
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await authService.refresh(refreshToken, ipAddress, userAgent);

    setRefreshCookie(res, newRefreshToken);

    logger.debug(`[Auth] Refresh success. reqId: ${reqId}, tabId: ${tabId}`);

    const permissionsAndRole = await authService.getUserPermissionsAndRole(user);
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    userObj.permissions = permissionsAndRole.permissions;
    userObj.roleDetails = permissionsAndRole.roleDetails;

    res.status(200).json({
      success: true,
      data: { user: userObj, accessToken },
    });
  } catch (err) {
    logger.error(`[Auth] Refresh failed. reqId: ${reqId}, tabId: ${tabId}, status: ${err.statusCode || 401}, msg: ${err.message}`);
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
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenDoc = await RefreshToken.findOne({ tokenHash }).populate('userId');
      if (tokenDoc && tokenDoc.userId) {
        req.user = tokenDoc.userId;
        await logAuditTrail(req, {
          action: 'LOGOUT',
          entityType: 'User',
          entityId: tokenDoc.userId._id,
        });
      }
    } catch (err) {
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
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  const permissionsAndRole = await authService.getUserPermissionsAndRole(user);
  const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
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
