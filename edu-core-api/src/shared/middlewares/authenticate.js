import User from '../../modules/users/user.model.js';
import { AuthError } from '../errors/AuthError.js';
import { verifyAccessToken } from '../services/tokenService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  // 1. Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('يرجى تسجيل الدخول للوصول إلى هذا المورد', 401);
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify token
  const decoded = verifyAccessToken(token);

  // 3. Check if user still exists and is active
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AuthError('المستخدم صاحب هذا الرمز لم يعد موجوداً', 401);
  }

  if (!user.isActive || user.deletedAt) {
    throw new AuthError('هذا الحساب غير نشط', 401);
  }

  // 4. Check tokenVersion (safely default to 0 to prevent mismatch due to undefined/missing fields in DB or populated objects)
  const dbTokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  const jwtTokenVersion = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;

  if (dbTokenVersion !== jwtTokenVersion) {
    throw new AuthError(
      'انتهت صلاحية الرمز بسبب تغيير كلمة المرور أو تسجيل الخروج من كل الأجهزة',
      401,
      'TOKEN_VERSION_MISMATCH'
    );
  }

  // 5. Grant access
  req.user = user;
  next();
});
