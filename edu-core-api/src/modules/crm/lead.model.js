import mongoose from 'mongoose';

const leadNoteSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const leadFollowUpSchema = new mongoose.Schema({
  scheduledAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const leadTimelineSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم العميل المحتمل مطلوب'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      trim: true,
    },
    source: {
      type: String,
      default: 'DIRECT', // e.g. INSTAGRAM, WHATSAPP, WEBSITE, FRIEND, DIRECT
    },
    campaign: {
      type: String,
      trim: true,
    },
    pipeline: {
      type: String,
      default: 'DEFAULT',
    },
    stage: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'],
      default: 'NEW',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    expectedValue: {
      type: Number, // Expected revenue value in fils (e.g. 50000 = 50 KD)
      default: 0,
      min: 0,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: [leadNoteSchema],
      default: [],
    },
    followUps: {
      type: [leadFollowUpSchema],
      default: [],
    },
    timeline: {
      type: [leadTimelineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Search and performance indexes
leadSchema.index({ phone: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
