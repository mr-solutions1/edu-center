import mongoose from 'mongoose';

import { PayrollAction } from '../../shared/constants/enums.js';

const payrollTransactionSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: false,
    },
    payrollRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRecord',
      default: null,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // The staff member who performed the action
    },
    lessonPrice: { type: Number }, // in fils
    teacherPercentage: Number,
    institutePercentage: Number,
    teacherEarnings: { type: Number }, // in fils
    instituteRevenue: { type: Number }, // in fils
    transportDeduction: {
      type: Number, // in fils
      default: 0,
    },
    action: {
      type: String,
      enum: Object.values(PayrollAction),
      default: PayrollAction.CREATE,
    },
    previousValue: Object,
    newValue: Object,
  },
  {
    timestamps: true,
  }
);

payrollTransactionSchema.index({ lessonId: 1 });
payrollTransactionSchema.index({ teacherId: 1 });
payrollTransactionSchema.index({ payrollRecordId: 1 });

const PayrollTransaction = mongoose.model(
  'PayrollTransaction',
  payrollTransactionSchema
);

export default PayrollTransaction;
