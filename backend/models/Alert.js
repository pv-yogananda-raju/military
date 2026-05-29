import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['Normal', 'Important', 'Critical'],
      default: 'Normal',
    },
    linkedEntity: {
      type: String,
      default: 'None',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: {
      type: [String],
      default: [],
    },
    creatorId: {
      type: String,
      required: true,
      default: 'System',
    },
    targetedOfficers: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for displaying urgent, unread tactical alerts
alertSchema.index({ priority: 1, isRead: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
