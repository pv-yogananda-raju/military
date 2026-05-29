import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema(
  {
    suspectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    alias: {
      type: String,
      default: 'Unknown',
    },
    associatedThreatLevel: {
      type: String,
      required: true,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'Low',
    },
    status: {
      type: String,
      required: true,
      enum: ['Wanted', 'Under Surveillance', 'Apprehended', 'Active'],
      default: 'Wanted',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    },
    linkedReports: {
      type: [String],
      default: [],
    },
    linkedMissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimizing threat level searches and location lookups
suspectSchema.index({ associatedThreatLevel: 1, status: 1 });
suspectSchema.index({ fullName: 'text', alias: 'text', location: 'text' });

const Suspect = mongoose.model('Suspect', suspectSchema);
export default Suspect;
