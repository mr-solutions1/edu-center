import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      required: [true, 'رقم الحساب مطلوب'],
    },
    name: {
      type: String,
      required: [true, 'اسم الحساب مطلوب'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'نوع الحساب مطلوب'],
      enum: {
        values: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
        message: 'نوع الحساب غير صالح',
      },
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance query index for multi-tenant COA listing
accountSchema.index({ accountNumber: 1 }, { unique: true });

const Account = mongoose.model('Account', accountSchema);

export default Account;
