import mongoose from 'mongoose';

const studentRegistrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'يجب تحديد الطالب'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'المادة الدراسية مطلوبة'],
      trim: true,
    },
    purchasedHours: {
      type: Number,
      required: [true, 'عدد الساعات المشتراة مطلوب'],
      min: [1, 'يجب شراء ساعة واحدة على الأقل'],
      default: 0,
    },
    consumedHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pricePerHour: {
      type: Number, // in fils
      required: [true, 'سعر الساعة مطلوب'],
      min: [0, 'سعر الساعة لا يمكن أن يكون سالباً'],
      default: 0,
    },
    teacherPercentageSnapshot: {
      type: Number, // percentage out of 100
      min: 0,
      max: 100,
      default: 75,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    discountAmount: {
      type: Number, // in fils
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number, // in fils
      required: true,
      min: 0,
      default: 0,
    },
    paidAmount: {
      type: Number, // in fils
      min: 0,
      default: 0,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
      index: true,
    },
    day1: {
      type: String,
      default: null,
    },
    from1: {
      type: String,
      default: null,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    to1: {
      type: String,
      default: null,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    day2: {
      type: String,
      default: null,
    },
    from2: {
      type: String,
      default: null,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    to2: {
      type: String,
      default: null,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudentRegistration = mongoose.model(
  'StudentRegistration',
  studentRegistrationSchema
);

export default StudentRegistration;
