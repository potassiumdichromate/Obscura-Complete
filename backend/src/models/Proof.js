// src/models/Proof.js (NO AUTH VERSION)
const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema({
  // For POC, we'll just use a simple identifier
  userIdentifier: {
    type: String,
    default: 'poc-user',
    index: true
  },
  type: {
    type: String,
    enum: ['accreditation', 'jurisdiction', 'income', 'ownership'],
    required: true
  },
  proof: {
    proof: String,
    programHash: String,
    publicInputs: [Number],
    proofType: String,
    timestamp: Number
  },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  threshold: Number,
  expiresAt: { type: Date, required: true, index: true },
  propertyId: String,
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  }
}, { timestamps: true });

// Virtual for checking if proof is valid
proofSchema.virtual('isValid').get(function() {
  return this.verified && this.status === 'active' && this.expiresAt > new Date();
});

// Static method to find valid proof
proofSchema.statics.findValidProof = async function(userIdentifier, type, minThreshold = null) {
  const query = {
    userIdentifier,
    type,
    verified: true,
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  if (minThreshold !== null) {
    query.threshold = { $gte: minThreshold };
  }
  return this.findOne(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Proof', proofSchema);