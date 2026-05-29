import mongoose from 'mongoose';

const intelligenceReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    threatLevel: {
      type: String,
      required: true,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'Low',
    },
    assignedOfficer: {
      type: String, // References officerId
      required: true,
      index: true,
    },
    suspectDetails: {
      type: String,
      default: 'None declared.',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    evidence: {
      type: [String], // References evidenceId keys
      default: [],
    },
    attachments: {
      type: [Object], // Mapped file details: { fileName, fileType, fileSize, fileUrl }
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Submitted', 'Under Review', 'Archived'],
      default: 'Submitted',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimal dashboard querying and search aggregation
intelligenceReportSchema.index({ threatLevel: 1, status: 1 });
intelligenceReportSchema.index({ title: 'text', description: 'text', location: 'text' });

const IntelligenceReport = mongoose.model('IntelligenceReport', intelligenceReportSchema);
export default IntelligenceReport;
