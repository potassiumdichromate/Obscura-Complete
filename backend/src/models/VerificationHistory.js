// File: backend/src/models/VerificationHistory.js
// MongoDB schema for verification audit trail

const mongoose = require('mongoose');

const verificationHistorySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['submitted', 'approved', 'rejected', 'under_review', 'resubmitted']
  },
  performedBy: {
    type: String,
    required: true
  },
  previousStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'under_review'],
    default: null
  },
  newStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'under_review'],
    required: true
  },
  notes: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for queries
verificationHistorySchema.index({ propertyId: 1, timestamp: -1 });
verificationHistorySchema.index({ action: 1, timestamp: -1 });

const VerificationHistory = mongoose.model('VerificationHistory', verificationHistorySchema);

module.exports = VerificationHistory;