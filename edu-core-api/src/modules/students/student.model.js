import mongoose from 'mongoose';

import {
  EducationalLevels,
  Gender,
  StudentStatus,
} from '../../shared/constants/enums.js';

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Improvement: Decoupled from mandatory User
    },
    studentCode: {
      type: String,
      required: true,
    },
    parentName: {
      type: String,
      required: [true, 'اسم ولي الأمر مطلوب'],
      trim: true,
    },
    parentPhone: {
      type: String,
      required: [true, 'رقم هاتف ولي الأمر مطلوب'],
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'العنوان مطلوب'],
      trim: true,
    },
    googleMapsUrl: {
      type: String,
      trim: true,
    },
    school: {
      type: String,
      trim: true,
    },
    grade: {
      type: String,
      enum: EducationalLevels,
      required: [true, 'المرحلة الدراسية مطلوبة'],
    },
    siblingGroup: {
      type: String,
      trim: true,
      default: null,
    },
    subjects: {
      type: [String],
      default: [],
    },
    preferredTeacherGender: {
      type: String,
      enum: Object.values(Gender),
    },
    preferredSchedule: {
      type: String,
    },
    notes: {
      type: String,
    },
    dateOfBirth: Date,
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(StudentStatus),
      default: StudentStatus.ACTIVE,
    },
    monthlyFee: {
      type: Number, // in fils
      default: 0,
      min: 0,
    },
    avatarUrl: String,
    deletedAt: {
      type: Date,
      default: null,
    },
    // Maintained search blob for text search optimization
    searchBlob: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
studentSchema.index({ studentCode: 1 }, { unique: true });
studentSchema.index({ status: 1 });
studentSchema.index({ grade: 1 });
studentSchema.index({ siblingGroup: 1 });
studentSchema.index({ searchBlob: 'text' });

// Middleware to maintain searchBlob
studentSchema.pre('save', function (next) {
  this.searchBlob =
    `${this.parentName} ${this.parentPhone} ${this.school || ''} ${this.area || ''}`.trim();
  next();
});

// Query middleware to exclude deleted students
studentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
