import InboxMessage from './inboxMessage.model.js';
import User from '../users/user.model.js';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// Get messages for a conversation (direct or group)
export const getMessages = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const userId = req.user._id;
  const { recipientId, groupKey } = req.query;

  const query = { tenantId };

  if (groupKey) {
    query.type = 'GROUP';
    query.groupKey = groupKey;
  } else if (recipientId) {
    query.type = 'DIRECT';
    query.$or = [
      { senderId: userId, recipientId },
      { senderId: recipientId, recipientId: userId },
    ];
  } else {
    // If no specific chat, return global announcements
    query.type = 'ANNOUNCEMENT';
  }

  const messages = await InboxMessage.find(query)
    .sort({ createdAt: 1 })
    .populate('senderId', 'firstName lastName avatarUrl role')
    .populate('recipientId', 'firstName lastName avatarUrl role');

  // Mark messages sent by the other user as read
  if (recipientId) {
    await InboxMessage.updateMany(
      {
        tenantId,
        senderId: recipientId,
        recipientId: userId,
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: new Date() } },
      }
    );
  } else if (groupKey) {
    await InboxMessage.updateMany(
      {
        tenantId,
        groupKey,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: new Date() } },
      }
    );
  }

  res.status(200).json({
    success: true,
    data: messages,
  });
});

// Send a Message and emit real-time event
export const sendMessage = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const branchId = req.user.branchId;
  const userId = req.user._id;
  const { recipientId, type, groupKey, content, attachments } = req.body;

  if (!content) {
    throw new AppError('محتوى الرسالة مطلوب', 400);
  }

  const message = await InboxMessage.create({
    tenantId,
    branchId,
    senderId: userId,
    recipientId: type === 'DIRECT' ? recipientId : null,
    type: type || 'DIRECT',
    groupKey: type === 'GROUP' ? groupKey : null,
    content,
    attachments: attachments || [],
    readBy: [{ userId, readAt: new Date() }],
  });

  const populated = await InboxMessage.findById(message._id)
    .populate('senderId', 'firstName lastName avatarUrl role')
    .populate('recipientId', 'firstName lastName avatarUrl role');

  // Optional Live Real-time Broadcast over Global WebSocket (Socket.IO)
  try {
    const io = req.app.get('io');
    if (io) {
      if (type === 'DIRECT' && recipientId) {
        io.to(`user-${recipientId}`).to(`user-${userId}`).emit('new_message', populated);
      } else if (type === 'GROUP' && groupKey) {
        io.to(`group-${groupKey}`).emit('new_message', populated);
      } else if (type === 'ANNOUNCEMENT') {
        io.to(`tenant-${tenantId}`).emit('new_announcement', populated);
      }
    }
  } catch (socketErr) {
    // Fail silently, message is saved in database anyway
  }

  res.status(211).json({
    success: true,
    message: 'تم إرسال الرسالة بنجاح',
    data: populated,
  });
});

// Get conversations & active contacts list for the inbox side-panel
export const getConversationsList = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const userId = req.user._id;

  // 1. Fetch other active users in same tenant to chat with
  const contacts = await User.find({
    tenantId,
    _id: { $ne: userId },
    isActive: true,
  }).select('firstName lastName role avatarUrl email');

  // 2. Fetch last messages to summarize unread count and latest conversations
  const recentMessages = await InboxMessage.find({
    tenantId,
    $or: [{ senderId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .populate('senderId', 'firstName lastName')
    .populate('recipientId', 'firstName lastName');

  // Compile active channels and conversations lists
  const conversationSummaryMap = {};

  recentMessages.forEach((msg) => {
    if (msg.type === 'DIRECT') {
      const otherUser = String(msg.senderId._id) === String(userId) ? msg.recipientId : msg.senderId;
      if (!otherUser) return;

      const otherId = String(otherUser._id);
      if (!conversationSummaryMap[otherId]) {
        const hasBeenRead = msg.readBy.some((r) => String(r.userId) === String(userId)) || String(msg.senderId._id) === String(userId);
        conversationSummaryMap[otherId] = {
          id: otherId,
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          role: otherUser.role,
          lastMessage: msg.content,
          time: msg.createdAt,
          unread: !hasBeenRead,
        };
      }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      contacts,
      conversations: Object.values(conversationSummaryMap),
    },
  });
});
