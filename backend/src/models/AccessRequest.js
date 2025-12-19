// backend/src/models/AccessRequest.js
const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    index: true,
  },
  requesterAddress: {
    type: String,
    required: true,
    index: true,
  },
  requesterPublicKey: {
    type: String,
    required: true,
  },
  accreditationProofId: {
    type: String,
    default: null,
  },
  jurisdictionProofId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'granted', 'denied'],
    default: 'pending',
    index: true,
  },
  encryptedKey: {
    type: String,
    default: null,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  grantedAt: {
    type: Date,
    default: null,
  },
  deniedAt: {
    type: Date,
    default: null,
  },
  denyReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound indexes
accessRequestSchema.index({ propertyId: 1, requesterAddress: 1 });
accessRequestSchema.index({ status: 1, requestedAt: -1 });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema);

module.exports = AccessRequest;