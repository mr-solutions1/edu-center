import mongoose from 'mongoose';

const parentStudentSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'حساب ولي الأمر مطلوب'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'سجل الطالب مطلوب'],
    },
    relationshipType: {
      type: String,
      enum: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'],
      default: 'GUARDIAN',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    emergencyContact: {
      type: Boolean,
      default: false,
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

// Prevent duplicate links between same parent and student
parentStudentSchema.index({ parentId: 1, studentId: 1 }, { unique: true });

const ParentStudent = mongoose.model('ParentStudent', parentStudentSchema);

export default ParentStudent;
