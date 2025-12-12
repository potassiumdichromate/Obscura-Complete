// File: backend/src/models/ProofEvent.js
// Public proof event log for transparency

const mongoose = require('mongoose');

const proofEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Event type
  type: {
    type: String,
    enum: ['proof_generated', 'proof_verified', 'proof_used'],
    required: true,
    index: true
  },
  
  // Proof type
  proofType: {
    type: String,
    enum: ['accreditation', 'jurisdiction', 'ownership'],
    required: true,
    index: true
  },
  
  // Anonymized user identifier (hashed for privacy)
  userHash: {
    type: String,
    required: true,
    index: true
  },
  
  // Proof ID reference
  proofId: {
    type: String,
    required: true,
    index: true
  },
  
  // Verification result (for verified events)
  verified: {
    type: Boolean,
    default: null
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional context (optional)
  context: {
    propertyId: {
      type: String,
      default: null
    },
    offerId: {
      type: String,
      default: null
    }
  },
  
  // Proof hash (NOT the proof itself - just a hash for reference)
  proofHash: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Indexes for efficient queries
proofEventSchema.index({ type: 1, timestamp: -1 });
proofEventSchema.index({ proofType: 1, timestamp: -1 });
proofEventSchema.index({ userHash: 1, timestamp: -1 });
proofEventSchema.index({ timestamp: -1 });

// Static method to create proof generation event
proofEventSchema.statics.logProofGeneration = async function(proofType, userIdentifier, proofId, proofHash) {
  const crypto = require('crypto');
  
  const userHash = crypto.createHash('sha256').update(userIdentifier).digest('hex').substring(0, 16);
  
  const event = new this({
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type: 'proof_generated',
    proofType,
    userHash,
    proofId,
    proofHash,
    verified: null,
    timestamp: new Date()
  });
  
  await event.save();
  return event;
};

// Static method to create proof verification event
proofEventSchema.statics.logProofVerification = async function(proofType, userIdentifier, proofId, verified, proofHash) {
  const crypto = require('crypto');
  
  const userHash = crypto.createHash('sha256').update(userIdentifier).digest('hex').substring(0, 16);
  
  const event = new this({
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type: 'proof_verified',
    proofType,
    userHash,
    proofId,
    proofHash,
    verified,
    timestamp: new Date()
  });
  
  await event.save();
  return event;
};

// Static method to create proof usage event
proofEventSchema.statics.logProofUsage = async function(proofType, userIdentifier, proofId, context) {
  const crypto = require('crypto');
  
  const userHash = crypto.createHash('sha256').update(userIdentifier).digest('hex').substring(0, 16);
  
  const event = new this({
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type: 'proof_used',
    proofType,
    userHash,
    proofId,
    context,
    timestamp: new Date()
  });
  
  await event.save();
  return event;
};

const ProofEvent = mongoose.model('ProofEvent', proofEventSchema);

module.exports = ProofEvent;