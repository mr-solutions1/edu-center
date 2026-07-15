import Permission from './permission.model.js';
import Role from './role.model.js';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// Get all system permissions grouped by category
export const getPermissions = asyncHandler(async (req, res) => {
  const permissions = await Permission.find({}).sort({ group: 1, name: 1 });

  // Group permissions by group field
  const grouped = permissions.reduce((acc, curr) => {
    const groupName = curr.group;
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push({
      id: curr._id,
      key: curr.key,
      name: curr.name,
      description: curr.description,
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: grouped,
  });
});

// Get all dynamic roles for the tenant
export const getRoles = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const roles = await Role.find({ tenantId }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: roles,
  });
});

// Create a custom dynamic role
export const createRole = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, key, description, permissions } = req.body;

  if (!name || !key) {
    throw new AppError('الاسم ومفتاح الدور مطلوبان', 400);
  }

  const existingRole = await Role.findOne({ tenantId, key: key.toUpperCase() });
  if (existingRole) {
    throw new AppError('مفتاح الدور هذا مسجل مسبقاً', 400);
  }

  const role = await Role.create({
    tenantId,
    name,
    key: key.toUpperCase(),
    description,
    permissions: permissions || [],
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الدور بنجاح',
    data: role,
  });
});

// Update role details and its permissions
export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const { name, description, permissions } = req.body;

  const role = await Role.findOne({ _id: id, tenantId });
  if (!role) {
    throw new AppError('الدور المطلوب غير موجود', 404);
  }

  // Prevent modifying critical system keys if needed (e.g., ADMIN)
  if (role.key === 'ADMIN' && req.user.role !== 'ADMIN') {
    throw new AppError('لا يمكن تعديل صلاحيات المدير العام من قبل مستخدم آخر', 403);
  }

  if (name) role.name = name;
  if (description) role.description = description;
  if (permissions) role.permissions = permissions;

  await role.save();

  res.status(200).json({
    success: true,
    message: 'تم تحديث الدور بنجاح',
    data: role,
  });
});

// Delete dynamic role
export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const role = await Role.findOne({ _id: id, tenantId });
  if (!role) {
    throw new AppError('الدور المطلوب غير موجود', 404);
  }

  // Prevent deleting primary system roles
  if (['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(role.key)) {
    throw new AppError('لا يمكن حذف الأدوار الأساسية للنظام', 400);
  }

  await Role.deleteOne({ _id: id });

  res.status(200).json({
    success: true,
    message: 'تم حذف الدور بنجاح',
  });
});
