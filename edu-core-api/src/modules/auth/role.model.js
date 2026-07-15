import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الدور مطلوب'],
      trim: true,
    },
    key: {
      type: String,
      required: [true, 'مفتاح الدور مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String], // Array of permission keys
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique key per tenant (handled via multiTenantPlugin automatically adding tenantId)
roleSchema.index({ tenantId: 1, key: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

export default Role;
