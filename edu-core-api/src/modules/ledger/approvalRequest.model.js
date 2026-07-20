import mongoose from 'mongoose';

const signatureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    signedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const approvalRequestSchema = new mongoose.Schema(
  {
    workflowType: {
      type: String,
      required: true,
      enum: ['PAYROLL_APPROVAL', 'REFUND_APPROVAL', 'EXPENSE_APPROVAL'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'معرف المرجع مطلوب'],
      index: true,
    },
    currentLevel: {
      type: Number, // Index of the active level in levels array (e.g. 0 for first level)
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    signatures: {
      type: [signatureSchema],
      default: [],
    },
    rejectReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

approvalRequestSchema.index({ status: 1, workflowType: 1 });

const ApprovalRequest = mongoose.model(
  'ApprovalRequest',
  approvalRequestSchema
);

export default ApprovalRequest;
