import mongoose from 'mongoose';

const missionLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  log: {
    type: String,
    required: true,
  },
  enteredBy: {
    type: String, // references officerId
    required: true,
  },
});

const missionSchema = new mongoose.Schema(
  {
    missionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    missionName: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    assignedOfficers: {
      type: [String], // Array of officerIds
      default: [],
    },
    objective: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    missionZone: {
      type: String,
      required: true,
      trim: true,
    },
    currentStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Active', 'Under Surveillance', 'Completed', 'Aborted'],
      default: 'Pending',
    },
    progressPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    missionLogs: {
      type: [missionLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

missionSchema.index({ currentStatus: 1, priority: 1 });

const Mission = mongoose.model('Mission', missionSchema);
export default Mission;
