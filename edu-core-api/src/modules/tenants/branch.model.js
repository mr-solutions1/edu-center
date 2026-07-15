import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'اسم الفرع مطلوب'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee branch name uniqueness per tenant
branchSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;
