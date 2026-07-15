import mongoose from 'mongoose';
import ActivityLog from './activityLog.model.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const getActivityLogs = asyncHandler(async (req, res) => {
  const { userId, entityType, entityId, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (userId) {
    filter.userId = userId;
  }
  if (entityType) {
    filter.entityType = entityType;
  }
  if (entityId) {
    filter.entityId = entityId;
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: logs,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get advanced audit trails (Admins only)
export const getAuditTrails = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [trails, total] = await Promise.all([
    mongoose.model('AuditTrail').find({ tenantId })
      .populate('actorId', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    mongoose.model('AuditTrail').countDocuments({ tenantId }),
  ]);

  res.status(200).json({
    success: true,
    data: trails,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});
