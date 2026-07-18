import mongoose from 'mongoose';

const financialLedgerSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
      index: true,
    },
    amount: {
      type: Number, // in fils
      required: [true, 'المبلغ مطلوب'],
      min: [0, 'المبلغ لا يمكن أن يكون سالباً'],
    },
    type: {
      type: String,
      required: [true, 'نوع الحركة المالية مطلوب'],
      enum: {
        values: [
          'STUDENT_PAYMENT',
          'TEACHER_PAYMENT',
          'EXPENSE',
          'PACKAGE_PURCHASE',
          'REFUND',
          'MANUAL_ADJUSTMENT',
          'TRANSPORT_DEDUCTION',
        ],
        message: 'نوع الحركة المالية غير صحيح',
      },
      index: true,
    },
    direction: {
      type: String,
      required: [true, 'اتجاه الحركة المالية مطلوب'],
      enum: {
        values: ['IN', 'OUT'],
        message: 'اتجاه الحركة المالية غير صحيح (IN أو OUT)',
      },
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
      enum: {
        values: [
          'StudentRegistration',
          'Payment',
          'Lesson',
          'PayrollRecord',
          'TeacherSalary',
          'Expense',
          'ManualAdjustment',
        ],
        message: 'نموذج المرجع غير صحيح',
      },
    },
    description: {
      type: String,
      required: [true, 'الوصف مطلوب'],
      trim: true,
    },
    transactionDate: {
      type: Date,
      required: [true, 'تاريخ المعاملة مطلوب'],
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الموظف القائم بالعملية مطلوب'],
    },
  },
  {
    timestamps: true,
  }
);

// High-performance financial queries index
financialLedgerSchema.index({ transactionDate: -1, type: 1 });

const FinancialLedger = mongoose.model('FinancialLedger', financialLedgerSchema);

export default FinancialLedger;
