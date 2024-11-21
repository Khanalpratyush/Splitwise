import mongoose, { Schema } from 'mongoose';

const memberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  category: {
    type: String,
    enum: ['home', 'trip', 'couple', 'other'],
    default: 'other'
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes
groupSchema.index({ ownerId: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ name: 'text' });

export const Group = mongoose.models.Group || mongoose.model('Group', groupSchema); 