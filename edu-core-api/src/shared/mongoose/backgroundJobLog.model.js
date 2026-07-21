import mongoose from 'mongoose';

const backgroundJobLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
    },
    executionDate: {
      type: String, // format: YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: ['RUNNING', 'SUCCESS', 'FAILED'],
      required: true,
      default: 'RUNNING',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    workerId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to guarantee distributed single execution
backgroundJobLogSchema.index({ jobName: 1, executionDate: 1 }, { unique: true });

const BackgroundJobLog = mongoose.model(
  'BackgroundJobLog',
  backgroundJobLogSchema
);

export default BackgroundJobLog;
