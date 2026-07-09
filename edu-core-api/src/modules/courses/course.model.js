import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الدورة مطلوب'],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      required: [true, 'كود الدورة مطلوب'],
    },
    description: String,
    subject: {
      type: String,
      required: [true, 'المادة العلمية مطلوبة'],
    },
    educationalLevel: {
      type: String,
      required: [true, 'المرحلة الدراسية مطلوبة'],
    },
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

// Query middleware to exclude deleted courses
courseSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
