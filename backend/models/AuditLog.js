import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: String, // String representation of the user (e.g., "Capt. Price (OFF-102)")
      required: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      enum: ['Authentication', 'Officers', 'Intelligence', 'Missions', 'Evidence', 'System', 'Concurrency', 'Comms'],
    },
    action: {
      type: String,
      required: true,
    },
    deviceDetails: {
      type: String,
      default: 'Tactical Console',
    },
    ipAddress: {
      type: String,
      default: '10.0.0.1', // Default secure intranet address
    },
  },
  {
    timestamps: true,
  }
);

// Decelerating order indexing to fetch recent audit logs instantly
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
