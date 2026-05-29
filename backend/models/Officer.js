import mongoose from 'mongoose';

const officerSchema = new mongoose.Schema(
  {
    officerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    rank: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['Admin Commander', 'Intelligence Officer', 'Surveillance Analyst', 'Field Officer'],
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    clearanceLevel: {
      type: String,
      required: true,
      enum: ['Level 1', 'Level 2', 'Level 3', 'Top Secret', 'Cosmic Top Secret'],
      default: 'Level 1',
    },
    contactDetails: {
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    assignedMissions: {
      type: [String],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'In Field', 'On Leave', 'Suspended', 'Pending Approval'],
      default: 'Active',
    },
    profileImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1579567724489-2fed7c8f9de6?auto=format&fit=crop&q=80&w=200', // Premium default soldier profile mockup
    },
    groupChatAccess: {
      type: Boolean,
      default: true,
    },
    dob: {
      type: String,
      default: '1988-06-15',
    },
    bloodGroup: {
      type: String,
      default: 'O+',
    },
    branchUnit: {
      type: String,
      default: 'Cyber warfare division',
    },
    enlistmentDate: {
      type: String,
      default: '2010-08-20',
    },
    cardIssueDate: {
      type: String,
      default: '2025-01-01',
    },
    cardExpirationDate: {
      type: String,
      default: '2035-01-01',
    },
    issuingAuthority: {
      type: String,
      default: 'SECURED COMMAND SYSTEM',
    },
    identificationMarks: {
      type: String,
      default: 'None declared.',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    plainPassword: {
      type: String,
      default: 'password123',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick searching of officers by name and rank
officerSchema.index({ fullName: 'text', rank: 'text' });

const Officer = mongoose.model('Officer', officerSchema);
export default Officer;
