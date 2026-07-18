import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: [true, 'التاريخ مطلوب'],
      default: Date.now,
    },
    type: {
      type: String,
      required: [true, 'نوع المعاملة مطلوب'],
      enum: ['STUDENT_PAYMENT', 'TEACHER_PAYMENT', 'EXPENSE'],
    },
    name: {
      type: String,
      required() {
        return (
          this.type === 'STUDENT_PAYMENT' || this.type === 'TEACHER_PAYMENT'
        );
      },
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    expenseItem: {
      type: String,
      required() {
        return this.type === 'EXPENSE';
      },
    },
    amount: {
      type: Number, // in fils
      required: [true, 'المبلغ مطلوب'],
      min: [1, 'المبلغ يجب أن يكون أكبر من الصفر'],
    },
    paymentMethod: {
      type: String,
      default: 'CASH',
    },
    reference: {
      type: String,
      default: '',
    },
    remainingBalance: {
      type: Number, // in fils
      default: 0,
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

transactionSchema.index({ date: -1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
