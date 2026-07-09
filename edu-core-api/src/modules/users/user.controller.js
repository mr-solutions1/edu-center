import User from './user.model.js';
import { UserRole } from '../../shared/constants/enums.js';
import { ForbiddenError } from '../../shared/errors/ForbiddenError.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

/**
 * @desc    Create user
 * @route   POST /api/v1/users
 * @access  Private (Admin)
 */
export const createUser = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body;

  const user = await User.create({
    email,
    passwordHash: password,
    firstName,
    lastName,
    phone,
    role,
  });

  const userResponse = user.toObject();
  delete userResponse.passwordHash;

  res.status(201).json({ success: true, data: userResponse });
});

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash');
  res.status(200).json({ success: true, data: users });
});

/**
 * @desc    Update user
 * @route   PATCH /api/v1/users/:id
 * @access  Private
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === UserRole.ADMIN;

  // Authorization check
  if (!isAdmin && req.user.id !== id) {
    throw new ForbiddenError('غير مسموح لك بتعديل هذا المستخدم');
  }

  // Field whitelisting to prevent privilege escalation
  const allowedUpdates = ['firstName', 'lastName', 'phoneNumber'];
  if (isAdmin) {
    allowedUpdates.push('role', 'isActive', 'email');
  }

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select('-passwordHash');

  if (!user) {
    throw new NotFoundError('المستخدم غير موجود');
  }

  res.status(200).json({ success: true, data: user });
});

/**
 * @desc    Change user password
 * @route   POST /api/v1/users/:id/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  // Authorization: Only user can change their own password, or Admin
  if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
    throw new ForbiddenError('غير مسموح لك بتغيير كلمة مرور هذا المستخدم');
  }

  const user = await User.findById(id).select('+passwordHash');
  if (!user) {
    throw new NotFoundError('المستخدم غير موجود');
  }

  if (!(await user.comparePassword(oldPassword))) {
    throw new ForbiddenError('كلمة المرور القديمة غير صحيحة');
  }

  user.passwordHash = newPassword;
  user.tokenVersion += 1; // Invalidate all active sessions
  await user.save();

  res
    .status(200)
    .json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

/**
 * @desc    Update user avatar
 * @route   PATCH /api/v1/users/:id/avatar
 * @access  Private
 */
export const updateAvatar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
    throw new ForbiddenError('غير مسموح لك بتعديل صورة هذا المستخدم');
  }

  if (!req.file) {
    throw new ForbiddenError('يرجى اختيار صورة للرفع');
  }

  const avatarUrl = `/uploads/profiles/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    id,
    { avatarUrl },
    { new: true }
  ).select('-passwordHash');

  if (!user) {
    throw new NotFoundError('المستخدم غير موجود');
  }

  res.status(200).json({ success: true, data: user });
});
