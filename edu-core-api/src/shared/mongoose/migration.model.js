import mongoose from 'mongoose';

const migrationSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

const Migration = mongoose.model('Migration', migrationSchema);

export default Migration;
