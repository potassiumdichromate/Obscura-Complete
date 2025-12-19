// File: backend/src/models/Offer.js
// MongoDB schema for property offers WITH PROOF TRACKING + BUYER FUNDING

const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  offerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  propertyId: {
    type: String,
    required: true,
    index: true
  },
  buyerAccountId: {
    type: String,
    required: true,
    index: true
  },
  sellerAccountId: {
    type: String,
    required: true,
    index: true
  },
  buyerUserIdentifier: {
    type: String,
    default: null,
    index: true
  },
  offerPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'completed'],
    default: 'pending',
    index: true
  },
  escrowId: {
    type: String,
    default: null
  },
  escrowFundingTxId: {
    type: String,
    default: null
  },
  // Store verified proof references
  verifiedProofs: {
    accreditation: {
      proofId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proof',
        default: null
      },
      threshold: {
        type: Number,
        default: null
      },
      expiresAt: {
        type: Date,
        default: null
      }
    },
    jurisdiction: {
      proofId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proof',
        default: null
      },
      restrictedCount: {
        type: Number,
        default: null
      },
      expiresAt: {
        type: Date,
        default: null
      }
    }
  },
  // NEW: Track buyer auto-funding
  buyerFunding: {
    mintTxId: {
      type: String,
      default: null
    },
    mintNoteId: {
      type: String,
      default: null
    },
    consumeTxId: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    failed: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    retried: {
      type: Boolean,
      default: false
    }
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  message: {
    type: String,
    default: null
  },
  // Settlement data
  completedAt: {
    type: Date,
    default: null
  },
  settlementTxIds: {
    propertyTransfer: {
      type: String,
      default: null
    },
    escrowRelease: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
offerSchema.index({ propertyId: 1, status: 1 });
offerSchema.index({ buyerAccountId: 1, status: 1 });
offerSchema.index({ sellerAccountId: 1, status: 1 });
offerSchema.index({ buyerUserIdentifier: 1, status: 1 });
offerSchema.index({ status: 1, createdAt: -1 });

// Virtual to check if proofs are still valid
offerSchema.virtual('proofsStillValid').get(function() {
  const now = new Date();
  let accreditationValid = true;
  let jurisdictionValid = true;

  if (this.verifiedProofs?.accreditation?.expiresAt) {
    accreditationValid = this.verifiedProofs.accreditation.expiresAt > now;
  }

  if (this.verifiedProofs?.jurisdiction?.expiresAt) {
    jurisdictionValid = this.verifiedProofs.jurisdiction.expiresAt > now;
  }

  return accreditationValid && jurisdictionValid;
});

// Virtual to check if buyer was successfully funded
offerSchema.virtual('isBuyerFunded').get(function() {
  return this.buyerFunding && 
         !this.buyerFunding.failed && 
         this.buyerFunding.consumeTxId;
});

// Method to check if offer is ready for escrow
offerSchema.methods.isReadyForEscrow = function() {
  return this.status === 'pending' && 
         this.proofsStillValid && 
         (this.isBuyerFunded || !this.buyerFunding);
};

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;