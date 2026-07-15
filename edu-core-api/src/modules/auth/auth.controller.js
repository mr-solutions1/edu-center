import * as authService from './auth.service.js';
import RefreshToken from './refreshToken.model.js';
import { env } from '../../config/env.js';
import * as auditLogger from '../../shared/services/auditLogger.service.js';
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

  // Audit Log
  await auditLogger.logActivity({
    userId: user._id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user._id,
    details: { ipAddress, userAgent },
    ipAddress,
    userAgent,
  });

  res.status(200).json({
    success: true,
    data: { user, accessToken },
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

  console.info('[BACKEND_REFRESH_TRACE_RECEIVED] ' + JSON.stringify({
    timestamp: new Date().toISOString(),
    reqId,
    tabId,
    source,
    cookiePresent: !!refreshToken,
    origin: req.get('origin'),
    referer: req.get('referer'),
    userAgent,
  }, null, 2));

  try {
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await authService.refresh(refreshToken, ipAddress, userAgent);

    setRefreshCookie(res, newRefreshToken);

    console.info('[BACKEND_REFRESH_TRACE_SUCCESS] ' + JSON.stringify({
      timestamp: new Date().toISOString(),
      reqId,
      tabId,
      status: 200,
    }, null, 2));

    res.status(200).json({
      success: true,
      data: { user, accessToken },
    });
  } catch (err) {
    console.error('[BACKEND_REFRESH_TRACE_ERROR] ' + JSON.stringify({
      timestamp: new Date().toISOString(),
      reqId,
      tabId,
      status: err.statusCode || 401,
      errorMsg: err.message,
    }, null, 2));
    throw err;
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  await authService.logout(refreshToken);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Logged out' });
});

/**
 * @desc    Logout from all sessions
 * @route   POST /api/v1/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req, res) => {
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
  res.status(200).json({ success: true, data: user });
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
