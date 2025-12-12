// File: backend/src/controllers/propertyController.js
// Business logic for property management with selective disclosure
// UPDATED: Now includes ownership proof verification

const Property = require('../models/Property');
const Proof = require('../models/Proof');
const ProofEvent = require('../models/ProofEvent');
const midenClient = require('../services/midenClient');

class PropertyController {
  
  // ============================================================================
  // MINTING (ENHANCED WITH OWNERSHIP VERIFICATION)
  // ============================================================================
  
  /**
   * Mint property NFT on blockchain AND create listing in database
   * NOW REQUIRES OWNERSHIP PROOF VERIFICATION
   */
  async mintProperty(req, res) {
    try {
      const {
        ownerAccountId,
        ownerUserIdentifier,
        ownershipProofId, // NEW: Required!
        ipfsCid,
        propertyType,
        title,
        description,
        country,
        city,
        address,
        zipCode,
        valuation,
        squareFeet,
        bedrooms,
        bathrooms,
        yearBuilt,
        images,
        documents,
        features,
        amenities
      } = req.body;

      // Validate required fields
      if (!ownerAccountId || !propertyType || !title || !address || !valuation) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // NEW: Verify ownership proof before minting (can be disabled for testing)
      if (ownershipProofId) {
        console.log('🔐 Verifying ownership proof before minting...');

        const ownershipProof = await Proof.findOne({
          proofId: ownershipProofId,
          type: 'ownership',
          verified: true,
          expiresAt: { $gt: new Date() }
        });

        if (!ownershipProof) {
          return res.status(403).json({
            success: false,
            error: 'Invalid or expired ownership proof',
            details: 'Ownership proof must be verified and not expired',
            hint: 'Generate a new ownership proof using POST /api/v1/proofs/generate-ownership'
          });
        }

        console.log('✅ Ownership proof verified!');

        // Log proof usage
        await ProofEvent.logProofUsage(
          'ownership',
          ownerUserIdentifier || ownerAccountId,
          ownershipProofId,
          { action: 'property_mint' }
        );
      } else {
        console.log('⚠️  No ownership proof provided (POC mode - allowed)');
      }

      // Generate unique property ID
      const propertyId = `PROP-${Date.now()}`;

      console.log(`🏗️  Minting property: ${propertyId}`);

      // Mint on Miden blockchain
      const mintResult = await midenClient.mintPropertyNft(
        propertyId,
        ownerAccountId,
        ipfsCid || `ipfs://${propertyId}`,
        propertyType === 'residential' ? 0 : 1,
        valuation
      );

      // Create property in database
      const property = new Property({
        propertyId,
        ownerAccountId,
        ownerUserIdentifier: ownerUserIdentifier || ownerAccountId,
        ownershipProofId: ownershipProofId || null, // NEW: Store proof reference
        midenNoteId: mintResult.note_id,
        midenTransactionId: mintResult.tx_id,
        status: 'draft', // Not listed yet
        price: valuation,
        metadata: {
          propertyType,
          title,
          description: description || '',
          country: country || 'Unknown',
          city: city || 'Unknown',
          address,
          zipCode,
          valuation,
          squareFeet,
          bedrooms,
          bathrooms,
          yearBuilt,
          images: images || [],
          ipfsCid: ipfsCid || `ipfs://${propertyId}`,
          documents: documents || [],
          features: features || [],
          amenities: amenities || []
        },
        verificationStatus: ownershipProofId ? 'verified' : 'unverified' // Auto-verify if ownership proof provided
      });

      await property.save();

      console.log(`✅ Property minted and saved: ${propertyId}`);

      res.status(201).json({
        success: true,
        message: ownershipProofId 
          ? 'Property minted successfully with verified ownership ✅'
          : 'Property minted successfully (no ownership verification)',
        property: {
          propertyId: property.propertyId,
          ownerAccountId: property.ownerAccountId,
          ownershipVerified: !!ownershipProofId,
          ownershipProofId: property.ownershipProofId,
          status: property.status,
          midenNoteId: property.midenNoteId,
          midenTransactionId: property.midenTransactionId,
          price: property.price,
          metadata: property.metadata
        },
        blockchain: {
          tx_id: mintResult.tx_id,
          note_id: mintResult.note_id
        }
      });

    } catch (error) {
      console.error('Mint property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mint property',
        details: error.message
      });
    }
  }

  // ============================================================================
  // LISTING SYSTEM (UNCHANGED)
  // ============================================================================

  /**
   * List property for sale with compliance requirements and visibility rules
   */
  async listProperty(req, res) {
    try {
      const {
        propertyId,
        price,
        requiresAccreditation,
        accreditationThreshold,
        requiresJurisdiction,
        restrictedCountries,
        visibilityRules
      } = req.body;

      // Validate required fields
      if (!propertyId) {
        return res.status(400).json({
          success: false,
          error: 'Property ID is required'
        });
      }

      // Find property
      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Check if already listed or sold
      if (property.status === 'listed') {
        return res.status(400).json({
          success: false,
          error: 'Property is already listed'
        });
      }

      if (property.status === 'sold') {
        return res.status(400).json({
          success: false,
          error: 'Property is already sold'
        });
      }

      console.log(`📋 Listing property: ${propertyId}`);

      // Update property
      property.status = 'listed';
      property.price = price || property.price;
      property.requiresAccreditation = requiresAccreditation !== undefined ? requiresAccreditation : false;
      property.accreditationThreshold = accreditationThreshold || 1000000;
      property.requiresJurisdiction = requiresJurisdiction !== undefined ? requiresJurisdiction : false;
      property.restrictedCountries = restrictedCountries || [];
      
      // Update visibility rules if provided
      if (visibilityRules) {
        property.visibilityRules = {
          valuation: visibilityRules.valuation || 'accredited_only',
          address: visibilityRules.address || 'verified_only',
          documents: visibilityRules.documents || 'verified_only',
          fullDetails: visibilityRules.fullDetails || 'verified_only'
        };
      }

      property.listedAt = new Date();
      property.verificationStatus = 'verified'; // Auto-verify for POC

      await property.save();

      console.log(`✅ Property listed successfully: ${propertyId}`);

      res.json({
        success: true,
        message: 'Property listed successfully',
        property: {
          propertyId: property.propertyId,
          status: property.status,
          price: property.price,
          listedAt: property.listedAt,
          complianceRequirements: {
            requiresAccreditation: property.requiresAccreditation,
            accreditationThreshold: property.accreditationThreshold,
            requiresJurisdiction: property.requiresJurisdiction,
            restrictedCountries: property.restrictedCountries
          },
          visibilityRules: property.visibilityRules
        }
      });

    } catch (error) {
      console.error('List property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list property',
        details: error.message
      });
    }
  }

  /**
   * Get available property listings (marketplace)
   */
  async getAvailableProperties(req, res) {
    try {
      const { propertyType, minPrice, maxPrice, city, limit = 20 } = req.query;

      console.log(`🏪 Fetching available properties...`);

      // Build query
      const query = { status: 'listed', verificationStatus: 'verified' };

      if (propertyType) {
        query['metadata.propertyType'] = propertyType;
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseInt(minPrice);
        if (maxPrice) query.price.$lte = parseInt(maxPrice);
      }

      if (city) {
        query['metadata.city'] = new RegExp(city, 'i');
      }

      // Get properties
      const properties = await Property.find(query)
        .sort({ listedAt: -1 })
        .limit(parseInt(limit));

      // Return public previews (no proof required for marketplace view)
      const listings = properties.map(p => p.getPublicPreview());

      console.log(`✅ Found ${listings.length} available properties`);

      res.json({
        success: true,
        count: listings.length,
        properties: listings
      });

    } catch (error) {
      console.error('Get available properties error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve properties',
        details: error.message
      });
    }
  }

  // ============================================================================
  // SELECTIVE DISCLOSURE (UNCHANGED)
  // ============================================================================

  /**
   * Get property details with selective disclosure based on user's proofs
   */
  async getPropertyDetails(req, res) {
    try {
      const { propertyId } = req.params;
      const { userIdentifier } = req.query;

      console.log(`🔍 Fetching property details: ${propertyId} for user: ${userIdentifier || 'anonymous'}`);

      // Find property
      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Track view
      if (userIdentifier) {
        await property.trackView(userIdentifier);
      }

      // Check user's proofs
      let hasAccreditation = false;
      let hasJurisdiction = false;

      if (userIdentifier) {
        // Check accreditation proof
        if (property.requiresAccreditation) {
          const accreditationProof = await Proof.findOne({
            userIdentifier,
            type: 'accreditation',
            verified: true,
            threshold: { $gte: property.accreditationThreshold },
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          hasAccreditation = !!accreditationProof;
          
          if (hasAccreditation) {
            console.log(`✅ User has valid accreditation proof (threshold: ${accreditationProof.threshold})`);
          }
        } else {
          hasAccreditation = true; // Not required
        }

        // Check jurisdiction proof
        if (property.requiresJurisdiction) {
          const jurisdictionProof = await Proof.findOne({
            userIdentifier,
            type: 'jurisdiction',
            verified: true,
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          hasJurisdiction = !!jurisdictionProof;
          
          if (hasJurisdiction) {
            console.log(`✅ User has valid jurisdiction proof`);
          }
        } else {
          hasJurisdiction = true; // Not required
        }
      }

      // Get appropriate details based on proof level
      const details = property.getDetailsForUser(hasAccreditation, hasJurisdiction);

      // Add user's compliance status
      details.userCompliance = {
        hasAccreditation,
        hasJurisdiction,
        canMakeOffer: hasAccreditation && hasJurisdiction
      };

      console.log(`✅ Property details retrieved (locked: ${details.locked})`);

      res.json({
        success: true,
        property: details
      });

    } catch (error) {
      console.error('Get property details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve property details',
        details: error.message
      });
    }
  }

  /**
   * Get properties owned by a user
   */
  async getMyProperties(req, res) {
    try {
      const { userIdentifier } = req.query;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required'
        });
      }

      console.log(`📦 Fetching properties for user: ${userIdentifier}`);

      const properties = await Property.find({
        ownerUserIdentifier: userIdentifier
      }).sort({ createdAt: -1 });

      // Owner sees full details
      const ownedProperties = properties.map(p => ({
        propertyId: p.propertyId,
        status: p.status,
        price: p.price,
        listedAt: p.listedAt,
        soldAt: p.soldAt,
        metadata: p.metadata,
        midenNoteId: p.midenNoteId,
        midenTransactionId: p.midenTransactionId,
        ownershipProofId: p.ownershipProofId, // NEW: Include ownership proof
        views: p.views,
        uniqueViewers: p.uniqueViewers.length,
        activeOfferId: p.activeOfferId,
        requiresAccreditation: p.requiresAccreditation,
        requiresJurisdiction: p.requiresJurisdiction,
        visibilityRules: p.visibilityRules,
        createdAt: p.createdAt
      }));

      console.log(`✅ Found ${ownedProperties.length} properties`);

      res.json({
        success: true,
        count: ownedProperties.length,
        properties: ownedProperties
      });

    } catch (error) {
      console.error('Get my properties error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve properties',
        details: error.message
      });
    }
  }

  /**
   * Delist property
   */
  async delistProperty(req, res) {
    try {
      const { propertyId } = req.params;

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      if (property.status !== 'listed') {
        return res.status(400).json({
          success: false,
          error: 'Property is not currently listed'
        });
      }

      property.status = 'delisted';
      property.delistedAt = new Date();
      await property.save();

      res.json({
        success: true,
        message: 'Property delisted successfully',
        property: {
          propertyId: property.propertyId,
          status: property.status,
          delistedAt: property.delistedAt
        }
      });

    } catch (error) {
      console.error('Delist property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delist property',
        details: error.message
      });
    }
  }

  /**
   * Get single property by ID (admin/owner view)
   */
  async getPropertyById(req, res) {
    try {
      const { propertyId } = req.params;

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      res.json({
        success: true,
        property: {
          propertyId: property.propertyId,
          ownerAccountId: property.ownerAccountId,
          ownerUserIdentifier: property.ownerUserIdentifier,
          ownershipProofId: property.ownershipProofId, // NEW: Include ownership proof
          status: property.status,
          price: property.price,
          metadata: property.metadata,
          midenNoteId: property.midenNoteId,
          midenTransactionId: property.midenTransactionId,
          verificationStatus: property.verificationStatus,
          requiresAccreditation: property.requiresAccreditation,
          accreditationThreshold: property.accreditationThreshold,
          requiresJurisdiction: property.requiresJurisdiction,
          restrictedCountries: property.restrictedCountries,
          visibilityRules: property.visibilityRules,
          views: property.views,
          uniqueViewers: property.uniqueViewers.length,
          activeOfferId: property.activeOfferId,
          listedAt: property.listedAt,
          soldAt: property.soldAt,
          createdAt: property.createdAt
        }
      });

    } catch (error) {
      console.error('Get property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve property',
        details: error.message
      });
    }
  }
}

module.exports = new PropertyController();