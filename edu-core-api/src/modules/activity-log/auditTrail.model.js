import mongoose from 'mongoose';

const auditTrailSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'نوع الإجراء مطلوب'],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'نوع الكيان مطلوب'],
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only record creation time
  }
);

// Performance indexes for security officers and admins
auditTrailSchema.index({ actorId: 1 });
auditTrailSchema.index({ entityType: 1, entityId: 1 });
auditTrailSchema.index({ tenantId: 1, createdAt: -1 });

const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);

export default AuditTrail;
