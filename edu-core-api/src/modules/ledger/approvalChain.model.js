import mongoose from 'mongoose';

const approvalChainSchema = new mongoose.Schema(
  {
    workflowType: {
      type: String,
      required: [true, 'نوع سير العمل مطلوب'],
      enum: ['PAYROLL_APPROVAL', 'REFUND_APPROVAL', 'EXPENSE_APPROVAL'],
    },
    levels: {
      type: [String], // Array of roles required consecutively, e.g. ['ACCOUNTANT', 'ADMIN']
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique workflow chains per tenant (handled automatically via global multiTenantPlugin)
approvalChainSchema.index({ tenantId: 1, workflowType: 1 }, { unique: true });

const ApprovalChain = mongoose.model('ApprovalChain', approvalChainSchema);

export default ApprovalChain;
