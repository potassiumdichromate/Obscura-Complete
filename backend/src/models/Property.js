// File: backend/src/models/Property.js
// MongoDB schema for property listings with selective disclosure

const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic identification
  propertyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Ownership
  ownerAccountId: {
    type: String,
    required: true,
    index: true
  },
  ownerUserIdentifier: {
    type: String,
    required: true,
    index: true
  },
  
  // Blockchain references
  midenNoteId: {
    type: String,
    default: null
  },
  midenTransactionId: {
    type: String,
    default: null
  },
  
  // Listing status
  status: {
    type: String,
    enum: ['draft', 'listed', 'offer_pending', 'sold', 'delisted'],
    default: 'draft',
    index: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true
  },
  
  // Compliance requirements
  requiresAccreditation: {
    type: Boolean,
    default: false
  },
  accreditationThreshold: {
    type: Number,
    default: 1000000 // Default $1M
  },
  requiresJurisdiction: {
    type: Boolean,
    default: false
  },
  restrictedCountries: {
    type: [String],
    default: []
  },
  
  // Selective disclosure rules
  visibilityRules: {
    // Who can see the valuation
    valuation: {
      type: String,
      enum: ['public', 'accredited_only', 'verified_only'],
      default: 'accredited_only'
    },
    // Who can see exact address
    address: {
      type: String,
      enum: ['public', 'accredited_only', 'verified_only'],
      default: 'verified_only'
    },
    // Who can see documents
    documents: {
      type: String,
      enum: ['public', 'accredited_only', 'verified_only'],
      default: 'verified_only'
    },
    // Who can see full property details
    fullDetails: {
      type: String,
      enum: ['public', 'accredited_only', 'verified_only'],
      default: 'verified_only'
    }
  },
  
  // Property metadata (full details)
  metadata: {
    // Basic info (usually public)
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'industrial', 'land'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    
    // Location info (selective disclosure)
    country: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      default: null
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    
    // Financial details (selective disclosure)
    valuation: {
      type: Number,
      required: true
    },
    
    // Physical details
    squareFeet: {
      type: Number,
      default: null
    },
    bedrooms: {
      type: Number,
      default: null
    },
    bathrooms: {
      type: Number,
      default: null
    },
    yearBuilt: {
      type: Number,
      default: null
    },
    
    // Media
    images: {
      type: [String],
      default: []
    },
    virtualTourUrl: {
      type: String,
      default: null
    },
    
    // Documents (IPFS CIDs)
    ipfsCid: {
      type: String,
      default: null
    },
    documents: [{
      name: String,
      type: String, // 'deed', 'valuation', 'inspection', etc.
      ipfsCid: String,
      uploadedAt: Date
    }],
    
    // Additional features
    features: {
      type: [String],
      default: []
    },
    amenities: {
      type: [String],
      default: []
    }
  },
  
  // Verification status
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: String,
    default: null
  },
  
  // Listing dates
  listedAt: {
    type: Date,
    default: null
  },
  delistedAt: {
    type: Date,
    default: null
  },
  soldAt: {
    type: Date,
    default: null
  },
  soldTo: {
    type: String,
    default: null
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  uniqueViewers: {
    type: [String],
    default: []
  },
  
  // Active offer tracking
  activeOfferId: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Compound indexes for efficient queries
propertySchema.index({ status: 1, listedAt: -1 });
propertySchema.index({ ownerAccountId: 1, status: 1 });
propertySchema.index({ status: 1, price: 1 });
propertySchema.index({ 'metadata.propertyType': 1, status: 1 });
propertySchema.index({ 'metadata.city': 1, status: 1 });
propertySchema.index({ requiresAccreditation: 1, requiresJurisdiction: 1 });

// Virtual for checking if property is available
propertySchema.virtual('isAvailable').get(function() {
  return this.status === 'listed';
});

// Virtual for anonymized location
propertySchema.virtual('anonymizedLocation').get(function() {
  return `${this.metadata.city}, ${this.metadata.country}`;
});

// Method to get public preview (no proofs needed)
propertySchema.methods.getPublicPreview = function() {
  return {
    propertyId: this.propertyId,
    title: this.metadata.title,
    description: this.metadata.description,
    propertyType: this.metadata.propertyType,
    price: this.price,
    location: this.anonymizedLocation,
    status: this.status,
    images: this.metadata.images.slice(0, 2), // Only first 2 images
    requiresAccreditation: this.requiresAccreditation,
    requiresJurisdiction: this.requiresJurisdiction,
    listedAt: this.listedAt,
    locked: true
  };
};

// Method to get details based on proof level
propertySchema.methods.getDetailsForUser = function(hasAccreditation, hasJurisdiction) {
  const verified = hasAccreditation && hasJurisdiction;
  const response = this.getPublicPreview();
  
  // Check valuation visibility
  if (this.visibilityRules.valuation === 'public' ||
      (this.visibilityRules.valuation === 'accredited_only' && hasAccreditation) ||
      (this.visibilityRules.valuation === 'verified_only' && verified)) {
    response.valuation = this.metadata.valuation;
  }
  
  // Check address visibility
  if (this.visibilityRules.address === 'public' ||
      (this.visibilityRules.address === 'accredited_only' && hasAccreditation) ||
      (this.visibilityRules.address === 'verified_only' && verified)) {
    response.address = this.metadata.address;
    response.zipCode = this.metadata.zipCode;
    response.coordinates = this.metadata.coordinates;
  }
  
  // Check documents visibility
  if (this.visibilityRules.documents === 'public' ||
      (this.visibilityRules.documents === 'accredited_only' && hasAccreditation) ||
      (this.visibilityRules.documents === 'verified_only' && verified)) {
    response.documents = this.metadata.documents;
    response.ipfsCid = this.metadata.ipfsCid;
  }
  
  // Check full details visibility
  if (this.visibilityRules.fullDetails === 'public' ||
      (this.visibilityRules.fullDetails === 'accredited_only' && hasAccreditation) ||
      (this.visibilityRules.fullDetails === 'verified_only' && verified)) {
    response.squareFeet = this.metadata.squareFeet;
    response.bedrooms = this.metadata.bedrooms;
    response.bathrooms = this.metadata.bathrooms;
    response.yearBuilt = this.metadata.yearBuilt;
    response.features = this.metadata.features;
    response.amenities = this.metadata.amenities;
    response.allImages = this.metadata.images;
    response.virtualTourUrl = this.metadata.virtualTourUrl;
    response.locked = false;
  }
  
  // Add compliance requirements
  response.complianceRequirements = {
    accreditation: this.requiresAccreditation ? {
      required: true,
      threshold: this.accreditationThreshold
    } : { required: false },
    jurisdiction: this.requiresJurisdiction ? {
      required: true,
      restrictedCountries: this.restrictedCountries
    } : { required: false }
  };
  
  return response;
};

// Method to track view
propertySchema.methods.trackView = function(userIdentifier) {
  this.views += 1;
  if (userIdentifier && !this.uniqueViewers.includes(userIdentifier)) {
    this.uniqueViewers.push(userIdentifier);
  }
  return this.save();
};

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;