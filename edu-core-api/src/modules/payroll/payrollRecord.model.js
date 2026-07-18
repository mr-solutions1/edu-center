import mongoose from 'mongoose';

const payrollRecordSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    completedLessons: {
      type: Number,
      default: 0,
    },
    totalLessonValue: {
      type: Number, // in fils
      default: 0,
    },
    teacherEarnings: {
      type: Number, // in fils
      default: 0,
    },
    instituteRevenue: {
      type: Number, // in fils
      default: 0,
    },
    transportDeductions: {
      type: Number, // in fils
      default: 0,
    },
    finalAmount: {
      type: Number, // in fils
      default: 0,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PAID'],
      default: 'DRAFT',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index per teacher/month/year
payrollRecordSchema.index(
  { teacherId: 1, month: 1, year: 1 },
  { unique: true }
);

const PayrollRecord = mongoose.model('PayrollRecord', payrollRecordSchema);

export default PayrollRecord;
