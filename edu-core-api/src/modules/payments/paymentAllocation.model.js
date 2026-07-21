import mongoose from 'mongoose';

const paymentAllocationSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    amount: {
      type: Number, // in fils
      required: true,
      min: 0,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for tracing allocation histories
paymentAllocationSchema.index({ paymentId: 1, registrationId: 1 });
paymentAllocationSchema.index({ studentId: 1, allocatedAt: 1 });

const PaymentAllocation = mongoose.model(
  'PaymentAllocation',
  paymentAllocationSchema
);

export default PaymentAllocation;
