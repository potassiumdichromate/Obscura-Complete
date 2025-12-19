// File: backend/src/models/ProofEvent.js
// Fixed ProofEvent model with proper proofId handling

const mongoose = require('mongoose');
const crypto = require('crypto');

const proofEventSchema = new mongoose.Schema({
  // Identity
  eventId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // Event Type
  type: {
    type: String,
    enum: ['proof_generated', 'proof_verified', 'proof_used'],
    required: true,
    index: true
  },
  
  // Proof Type
  proofType: {
    type: String,
    enum: ['accreditation', 'jurisdiction', 'ownership'],
    required: true,
    index: true
  },
  
  // Anonymized User (SHA256 hash of userIdentifier)
  userHash: {
    type: String,
    required: true,
    index: true
  },
  
  // Proof Reference
  proofId: {
    type: String,
    required: true,
    index: true
  },
  
  // Verification Status
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
  
  // Proof Hash (for transparency without revealing proof)
  proofHash: {
    type: String,
    default: null
  },
  
  // Optional Context
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// INDEXES
proofEventSchema.index({ type: 1, timestamp: -1 });
proofEventSchema.index({ proofType: 1, timestamp: -1 });
proofEventSchema.index({ userHash: 1, timestamp: -1 });
proofEventSchema.index({ proofId: 1 });

// STATIC METHODS

/**
 * Log proof generation event
 */
proofEventSchema.statics.logProofGeneration = async function(
  proofType,
  userIdentifier,
  proofId,
  proofHash,
  verified = true
) {
  try {
    // Generate event ID
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Hash user identifier (anonymize)
    const userHash = crypto
      .createHash('sha256')
      .update(userIdentifier)
      .digest('hex')
      .substring(0, 16);
    
    // Create event
    const event = new this({
      eventId,
      type: 'proof_generated',
      proofType,
      userHash,
      proofId,  // ← FIXED: Now properly included
      verified,
      proofHash,
      timestamp: new Date()
    });
    
    await event.save();
    
    console.log(`✅ ProofEvent logged: ${eventId} (${proofType})`);
    
    return event;
  } catch (error) {
    console.error('❌ Failed to log proof generation:', error.message);
    // Don't throw - logging failure shouldn't break proof generation
    return null;
  }
};

/**
 * Log proof verification event
 */
proofEventSchema.statics.logProofVerification = async function(
  proofType,
  userIdentifier,
  proofId,
  verified,
  proofHash
) {
  try {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const userHash = crypto
      .createHash('sha256')
      .update(userIdentifier)
      .digest('hex')
      .substring(0, 16);
    
    const event = new this({
      eventId,
      type: 'proof_verified',
      proofType,
      userHash,
      proofId,  // ← FIXED
      verified,
      proofHash,
      timestamp: new Date()
    });
    
    await event.save();
    
    console.log(`✅ ProofEvent logged: ${eventId} (verification)`);
    
    return event;
  } catch (error) {
    console.error('❌ Failed to log proof verification:', error.message);
    return null;
  }
};

/**
 * Log proof usage event
 */
proofEventSchema.statics.logProofUsage = async function(
  proofType,
  userIdentifier,
  proofId,
  context = null
) {
  try {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const userHash = crypto
      .createHash('sha256')
      .update(userIdentifier)
      .digest('hex')
      .substring(0, 16);
    
    const event = new this({
      eventId,
      type: 'proof_used',
      proofType,
      userHash,
      proofId,  // ← FIXED
      context,
      timestamp: new Date()
    });
    
    await event.save();
    
    console.log(`✅ ProofEvent logged: ${eventId} (usage)`);
    
    return event;
  } catch (error) {
    console.error('❌ Failed to log proof usage:', error.message);
    return null;
  }
};

module.exports = mongoose.model('ProofEvent', proofEventSchema);