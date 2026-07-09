import mongoose from 'mongoose';

import {
  CommissionModel,
  Gender,
  WeekDays,
  CompensationType,
} from '../../shared/constants/enums.js';

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeCode: {
      type: String,
      required: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    civilId: {
      type: String,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    gradesTaught: {
      type: [String],
      default: [],
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    nationality: String,
    experienceYears: {
      type: Number,
      default: 0,
    },
    address: String,
    googleMapsUrl: String,
    availability: {
      days: [
        {
          type: String,
          enum: Object.values(WeekDays),
        },
      ],
      slots: [
        {
          start: {
            type: String,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm
          },
          end: {
            type: String,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm
          },
        },
      ],
    },
    ownsCar: {
      type: Boolean,
      default: false,
    },
    transportationAvailable: {
      type: Boolean,
      default: false,
    },
    usesInstituteCar: {
      type: Boolean,
      default: false,
    },
    hourlyRate: {
      type: Number, // in fils
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5,
    },
    compensationType: {
      type: String,
      enum: Object.values(CompensationType),
      default: CompensationType.PER_LESSON,
    },
    commissionModel: {
      type: String,
      enum: Object.values(CommissionModel),
      default: CommissionModel.SEVENTY_THIRTY,
    },
    teacherPercentage: {
      type: Number,
      default: 0.7,
    },
    institutePercentage: {
      type: Number,
      default: 0.3,
    },
    cvUrl: String,
    certificatesUrl: String,
    department: String,
    hireDate: {
      type: Date,
      default: Date.now,
    },
    bio: String,
    avatarUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teacherSchema.index({ employeeCode: 1 }, { unique: true });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ 'availability.days': 1 });

// Query middleware to exclude deleted teachers
teacherSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);

export default Teacher;
