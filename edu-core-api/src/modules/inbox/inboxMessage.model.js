import mongoose from 'mongoose';

const messageReadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  readAt: {
    type: Date,
    default: Date.now,
  },
});

const inboxMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'معرف المرسل مطلوب'],
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null for group or global announcements
    },
    type: {
      type: String,
      enum: ['DIRECT', 'GROUP', 'ANNOUNCEMENT'],
      default: 'DIRECT',
    },
    groupKey: {
      type: String,
      trim: true,
      default: null, // e.g. "admin-teachers", "class-math"
    },
    content: {
      type: String,
      required: [true, 'محتوى الرسالة مطلوب'],
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    readBy: {
      type: [messageReadSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for instant chat loads
inboxMessageSchema.index({ senderId: 1, recipientId: 1 });
inboxMessageSchema.index({ recipientId: 1 });
inboxMessageSchema.index({ groupKey: 1 });
inboxMessageSchema.index({ createdAt: -1 });

const InboxMessage = mongoose.model('InboxMessage', inboxMessageSchema);

export default InboxMessage;
