import mongoose from 'mongoose';

import { LessonStatus } from '../../shared/constants/enums.js';

const lessonSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'يجب تحديد الطالب'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'يجب تحديد المعلم'],
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentRegistration',
      default: null,
    },
    payrollRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRecord',
      default: null,
    },
    subject: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: [true, 'عنوان الحصة مطلوب'],
    },
    description: String,
    dayOfWeek: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    durationHours: {
      type: Number,
      default: 1,
      min: 0.5,
    },
    lessonDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(LessonStatus),
      default: LessonStatus.SCHEDULED,
    },
    notes: String,
    lessonPrice: {
      type: Number, // in fils
      required: true,
      min: 0,
    },
    educationalLevel: String,
    // Financial snapshot
    teacherPercentage: Number,
    institutePercentage: Number,
    teacherEarnings: {
      type: Number, // in fils
      default: 0,
    },
    instituteRevenue: {
      type: Number, // in fils
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for conflict detection and reports
lessonSchema.index({ teacherId: 1, lessonDate: 1 });
lessonSchema.index({ studentId: 1, lessonDate: 1 });
lessonSchema.index({ status: 1 });
lessonSchema.index({ lessonDate: 1 });
lessonSchema.index({ registrationId: 1 });
lessonSchema.index({ payrollRecordId: 1 });

// Helper to block updates if lesson is locked in a finalized payroll
const checkAndBlockIfLocked = async (payrollRecordId) => {
  if (payrollRecordId) {
    const PayrollRecord = mongoose.model('PayrollRecord');
    const pr = await PayrollRecord.findById(payrollRecordId);
    if (pr && ['PENDING_APPROVAL', 'APPROVED', 'PAID'].includes(pr.status)) {
      throw new Error('لا يمكن تعديل أو حذف حصة مغلقة ومدرجة في كشف الرواتب المعتمد');
    }
  }
};

// Lesson Immutability Lock Pre-Save Guard
lessonSchema.pre('save', async function (next) {
  if (!this.isNew && (this.isModified('status') || this.isModified('lessonPrice') || this.isModified('durationHours') || this.isModified('lessonDate'))) {
    try {
      await checkAndBlockIfLocked(this.payrollRecordId);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Lesson Immutability Lock Pre-Remove Guard
lessonSchema.pre('remove', async function (next) {
  try {
    await checkAndBlockIfLocked(this.payrollRecordId);
  } catch (err) {
    return next(err);
  }
  next();
});

// Lesson Immutability Lock Query-Level Guard (updateOne, updateMany, findOneAndUpdate, deleteOne, deleteMany, findOneAndDelete)
const blockQueryIfLocked = async function (next) {
  try {
    const query = this.getQuery();
    const Lesson = mongoose.model('Lesson');
    const docs = await Lesson.find(query);
    for (const doc of docs) {
      await checkAndBlockIfLocked(doc.payrollRecordId);
    }
  } catch (err) {
    return next(err);
  }
  next();
};

lessonSchema.pre('updateOne', blockQueryIfLocked);
lessonSchema.pre('updateMany', blockQueryIfLocked);
lessonSchema.pre('findOneAndUpdate', blockQueryIfLocked);
lessonSchema.pre('deleteOne', blockQueryIfLocked);
lessonSchema.pre('deleteMany', blockQueryIfLocked);
lessonSchema.pre('findOneAndDelete', blockQueryIfLocked);

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;
