import mongoose from 'mongoose';

const generalLedgerSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'الحساب مطلوب'],
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'معرف المرجع مطلوب'],
      index: true,
    },
    referenceModel: {
      type: String,
      required: [true, 'نموذج المرجع مطلوب'],
      enum: ['FinancialLedger', 'Transaction', 'Payment', 'PayrollRecord'],
    },
    debit: {
      type: Number, // in fils
      default: 0,
      min: [0, 'لا يمكن للمدين أن يكون سالباً'],
    },
    credit: {
      type: Number, // in fils
      default: 0,
      min: [0, 'لا يمكن للدائن أن يكون سالباً'],
    },
    description: {
      type: String,
      required: [true, 'الوصف مطلوب'],
      trim: true,
    },
    entryDate: {
      type: Date,
      required: [true, 'التاريخ مطلوب'],
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

generalLedgerSchema.index({ entryDate: -1 });

const GeneralLedger = mongoose.model('GeneralLedger', generalLedgerSchema);

export default GeneralLedger;
