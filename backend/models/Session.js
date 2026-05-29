import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    officerId: {
      type: String,
      required: true,
      index: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'Terminated'],
      default: 'Active',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'Tactical Device Client',
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);
export default Session;
