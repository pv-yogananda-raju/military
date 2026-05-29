import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      index: true,
    },
    recipient: {
      type: String, // 'GLOBAL' for group chat, or officerId for 1-to-1 private chat
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    attachments: {
      type: [Object],
      default: [],
    },
    readStatus: {
      type: String,
      enum: ['Sent', 'Delivered', 'Read'],
      default: 'Sent',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index to query messages in chronological order
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
