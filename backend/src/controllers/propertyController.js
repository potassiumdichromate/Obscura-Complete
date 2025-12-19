// File: backend/src/controllers/propertyController.js
// UPDATED: Added encrypted minting alongside existing functionality
// ALL YOUR EXISTING FUNCTIONS PRESERVED + NEW ENCRYPTED MINTING

const Property = require('../models/Property');
const Proof = require('../models/Proof');
const ProofEvent = require('../models/ProofEvent');
const midenClient = require('../services/midenClient');
const backgroundConsumeService = require('../services/backgroundConsumeService');
const encryptionService = require('../services/encryptionService');
const ipfsService = require('../services/ipfsService');

class PropertyController {
  
  // ============================================================================
  // EXISTING: MINTING WITH BACKGROUND CONSUME (PRESERVED)
  // ============================================================================
  
  /**
   * Mint property NFT on blockchain AND create listing in database
   * NEW: Starts background note consumption automatically
   */
  async mintProperty(req, res) {
    try {
      const {
        ownerAccountId,
        ownerUserIdentifier,
        ownershipProofId,
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

      // ============================================================================
      // Ownership proof verification (same as before)
      // ============================================================================
      if (ownershipProofId) {
        console.log('🔐 Verifying ownership proof before minting...');
        
        let ownershipProof = await Proof.findOne({
          proofId: ownershipProofId,
          type: 'ownership'
        });

        if (!ownershipProof) {
          try {
            ownershipProof = await Proof.findOne({
              _id: ownershipProofId,
              type: 'ownership'
            });
          } catch (err) {
            console.log(`❌ Invalid ObjectId format: ${err.message}`);
          }
        }

        if (!ownershipProof) {
          return res.status(403).json({
            success: false,
            error: 'Invalid or expired ownership proof',
            hint: 'Generate a new ownership proof using POST /api/v1/proofs/generate-ownership'
          });
        }

        if (!ownershipProof.verified) {
          return res.status(403).json({
            success: false,
            error: 'Ownership proof must be verified'
          });
        }

        if (new Date() > new Date(ownershipProof.expiresAt)) {
          return res.status(403).json({
            success: false,
            error: 'Ownership proof has expired'
          });
        }

        if (ownerUserIdentifier && ownershipProof.userIdentifier && 
            ownershipProof.userIdentifier !== ownerUserIdentifier) {
          return res.status(403).json({
            success: false,
            error: 'Ownership proof belongs to a different user'
          });
        }

        console.log('✅ All ownership proof validations passed!');

        try {
          await ProofEvent.logProofUsage(
            'ownership',
            ownerUserIdentifier || ownerAccountId,
            ownershipProofId,
            { action: 'property_mint' }
          );
        } catch (logErr) {
          console.warn('⚠️  Failed to log proof usage:', logErr.message);
        }
      }

      // Generate unique property ID
      const propertyId = `PROP-${Date.now()}`;

      console.log(`🏗️  Minting property: ${propertyId}`);

      // ============================================================================
      // Mint on Miden blockchain (returns immediately with placeholder note ID)
      // ============================================================================
      const mintResult = await midenClient.createPropertyToken({
        id: propertyId,
        ipfsCid: ipfsCid || `ipfs://${propertyId}`,
        type: propertyType,
        price: valuation
      }, ownerAccountId);

      // ============================================================================
      // Create property in database with consume status 'pending'
      // ============================================================================
      const property = new Property({
        propertyId,
        ownerAccountId,
        ownerUserIdentifier: ownerUserIdentifier || ownerAccountId,
        ownershipProofId: ownershipProofId || null,
        midenNoteId: mintResult.noteId,
        midenTransactionId: mintResult.transactionId,
        status: 'draft',
        consumeStatus: 'pending',
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
          documents: documents.map(d => ({
            name: d,
            type: 'encrypted',
            ipfsCid: ipfsResult.cid,
            uploadedAt: new Date()
          })),
          features: features || [],
          amenities: amenities || []
        },
        verificationStatus: ownershipProofId ? 'verified' : 'unverified'
      });

      await property.save();

      // ============================================================================
      // START BACKGROUND NOTE CONSUMPTION (non-blocking)
      // ============================================================================
      console.log(`🔥 Starting background consume for ${propertyId}...`);
      backgroundConsumeService.startConsumeInBackground(propertyId, mintResult.noteId);
      console.log(`✅ Background consume started - user can continue working!`);

      console.log(`✅ Property minted and saved: ${propertyId}`);

      res.status(201).json({
        success: true,
        message: ownershipProofId 
          ? 'Property minted successfully with verified ownership ✅'
          : 'Property minted successfully',
        property: {
          propertyId: property.propertyId,
          ownerAccountId: property.ownerAccountId,
          ownershipVerified: !!ownershipProofId,
          status: property.status,
          consumeStatus: property.consumeStatus,
          midenNoteId: property.midenNoteId,
          midenTransactionId: property.midenTransactionId,
          price: property.price,
          metadata: property.metadata
        },
        blockchain: {
          tx_id: mintResult.transactionId,
          note_id: mintResult.noteId,
          explorer_url: mintResult.explorerUrl
        },
        consume: {
          status: 'pending',
          message: 'Note is being consumed in background. You can continue working.',
          checkStatusAt: `/api/v1/properties/${propertyId}/consume-status`
        }
      });

    } catch (error) {
      console.error('❌ Mint property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mint property',
        details: error.message
      });
    }
  }

  // ============================================================================
  // NEW: ENCRYPTED MINTING WITH IPFS (FOR DEMO)
  // ============================================================================
  
  /**
   * Mint encrypted property as NFT with real IPFS upload
   * POST /api/v1/properties/mint-encrypted
   */
  async mintEncryptedProperty(req, res) {
    try {
      const {
        title,
        location,
        price,
        propertyType = 'residential',
        documents = [],
        ownerAccountId = 'alice',
        description = '',
        features = [],
        requiresAccreditation = true,
        accreditationThreshold = 1000000,
        requiresJurisdiction = true,
        restrictedCountries = ['US', 'KP', 'IR']
      } = req.body;

      console.log('🔐 Starting encrypted property minting');

      // Generate property ID
      const propertyId = `PROP-${Date.now()}`;
      
      // Create metadata to encrypt
      const metadata = {
        propertyId,
        title,
        location,
        price,
        propertyType,
        documents,
        description,
        features,
        ownerAccountId,
        listedAt: new Date().toISOString()
      };

      console.log('📝 Property metadata created');

      // Encrypt metadata
      console.log('🔒 Encrypting property metadata...');
      const encrypted = encryptionService.encryptMetadata(metadata);
      console.log('✅ Metadata encrypted');

      // Upload to IPFS
      console.log('📤 Uploading to IPFS...');
      const ipfsPackage = {
        version: '1.0',
        algorithm: encrypted.algorithm,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        tag: encrypted.tag,
        timestamp: new Date().toISOString(),
        metadata: {
          encrypted: true,
          requiresProofVerification: true,
          propertyType
        }
      };

      const ipfsResult = await ipfsService.uploadJSON(ipfsPackage, `property-${propertyId}`);
      console.log(`✅ Uploaded to IPFS: ${ipfsResult.cid}`);

      // Mint on Miden blockchain
      console.log('⛓️  Minting NFT on Miden testnet...');
      const mintResult = await midenClient.createPropertyToken({
        id: propertyId,
        ipfsCid: ipfsResult.cid,
        type: propertyType,
        price: price
      }, ownerAccountId);

      console.log('✅ NFT minted on Miden!');

      // Save to database (reusing existing Property model)
      const property = new Property({
        propertyId,
        ownerAccountId,
        ownerUserIdentifier: ownerAccountId,
        midenNoteId: mintResult.noteId,
        midenTransactionId: mintResult.transactionId,
        status: 'draft',
        consumeStatus: 'pending',
        price,
        metadata: {
          propertyType,
          title,
          description,
          country: 'Encrypted',
          city: 'Encrypted',
          address: location,
          valuation: price,
          ipfsCid: ipfsResult.cid,
          documents: documents.map(d => ({ name: d, type: 'encrypted' })),
          features
        },
        requiresAccreditation,
        accreditationThreshold,
        requiresJurisdiction,
        restrictedCountries,
        verificationStatus: 'pending',
        // Store encryption data in a separate field (you might need to add this to model)
        encryptionData: {
          key: encrypted.key,
          iv: encrypted.iv,
          tag: encrypted.tag,
          algorithm: encrypted.algorithm
        }
      });

      await property.save();

      // Start background consume
      console.log('🔄 Starting background note consumption...');
      backgroundConsumeService.startConsumeInBackground(propertyId, mintResult.noteId);

      res.status(201).json({
        success: true,
        message: 'Property minted with encryption on Miden testnet! 🎉',
        property: {
          id: propertyId,
          noteId: mintResult.noteId,
          transactionId: mintResult.transactionId,
          ipfsCid: ipfsResult.cid,
          ipfsUrl: ipfsResult.url,
          price,
          propertyType,
          status: 'draft',
          encrypted: true
        },
        blockchain: {
          network: 'Miden Testnet',
          transactionId: mintResult.transactionId,
          noteId: mintResult.noteId,
          explorerUrl: mintResult.explorerUrl
        },
        ipfs: {
          cid: ipfsResult.cid,
          url: ipfsResult.url,
          mock: ipfsResult.mock || false
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          encrypted: true,
          ownerKey: encrypted.key,
          note: 'Decryption key only shared after proof verification'
        },
        access: {
          owner: ownerAccountId,
          requiresAccreditation,
          requiresJurisdiction,
          restrictedCountries
        }
      });

    } catch (error) {
      console.error('Mint encrypted property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mint encrypted property',
        details: error.message
      });
    }
  }

  // ============================================================================
  // EXISTING: CONSUME STATUS ENDPOINTS (PRESERVED)
  // ============================================================================

  async getConsumeStatus(req, res) {
    try {
      const { propertyId } = req.params;
      const status = await backgroundConsumeService.getConsumeStatus(propertyId);
      res.json(status);
    } catch (error) {
      console.error('Get consume status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get consume status',
        details: error.message
      });
    }
  }

  async getPendingConsumes(req, res) {
    try {
      const pending = await backgroundConsumeService.getPendingConsumes();
      res.json({
        success: true,
        count: pending.length,
        properties: pending
      });
    } catch (error) {
      console.error('Get pending consumes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending consumes',
        details: error.message
      });
    }
  }

  async retryConsume(req, res) {
    try {
      const { propertyId } = req.params;
      const result = await backgroundConsumeService.retryConsume(propertyId);
      res.json({
        success: true,
        message: 'Consume retry started',
        ...result
      });
    } catch (error) {
      console.error('Retry consume error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry consume',
        details: error.message
      });
    }
  }

  async consumePropertyNote(req, res) {
    try {
      const { propertyId } = req.params;
      console.log(`📥 Manual consume request for property: ${propertyId}`);
      
      const property = await Property.findOne({ propertyId });
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      if (property.consumeStatus === 'consumed') {
        return res.status(400).json({
          success: false,
          error: 'Property note already consumed',
          message: 'This property is already ready for settlement'
        });
      }

      if (property.consumeStatus === 'consuming') {
        return res.status(400).json({
          success: false,
          error: 'Property note is currently being consumed in background',
          message: 'Please wait for background process to complete',
          checkStatusAt: `/api/v1/properties/${propertyId}/consume-status`
        });
      }
      
      console.log(`🔥 Manual consume triggered for: ${propertyId}`);
      await backgroundConsumeService.startConsumeInBackground(propertyId, property.midenNoteId);
      
      res.json({
        success: true,
        message: 'Manual consume started in background',
        checkStatusAt: `/api/v1/properties/${propertyId}/consume-status`
      });
      
    } catch (error) {
      console.error('❌ Manual consume error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to consume property note',
        details: error.message
      });
    }
  }

  // ============================================================================
  // EXISTING: LISTING SYSTEM (ALL PRESERVED)
  // ============================================================================

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

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          error: 'Property ID is required'
        });
      }

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

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

      property.status = 'listed';
      property.price = price || property.price;
      property.requiresAccreditation = requiresAccreditation !== undefined ? requiresAccreditation : false;
      property.accreditationThreshold = accreditationThreshold || 1000000;
      property.requiresJurisdiction = requiresJurisdiction !== undefined ? requiresJurisdiction : false;
      property.restrictedCountries = restrictedCountries || [];
      
      if (visibilityRules) {
        property.visibilityRules = {
          valuation: visibilityRules.valuation || 'accredited_only',
          address: visibilityRules.address || 'verified_only',
          documents: visibilityRules.documents || 'verified_only',
          fullDetails: visibilityRules.fullDetails || 'verified_only'
        };
      }

      property.listedAt = new Date();
      property.verificationStatus = 'verified';

      await property.save();

      console.log(`✅ Property listed successfully: ${propertyId}`);

      res.json({
        success: true,
        message: 'Property listed successfully',
        property: {
          propertyId: property.propertyId,
          status: property.status,
          consumeStatus: property.consumeStatus,
          price: property.price,
          listedAt: property.listedAt,
          readyForSettlement: property.isReadyForSettlement()
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

  async getAvailableProperties(req, res) {
    try {
      const { propertyType, minPrice, maxPrice, city, limit = 20 } = req.query;

      console.log(`🏪 Fetching available properties...`);

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

      const properties = await Property.find(query)
        .sort({ listedAt: -1 })
        .limit(parseInt(limit));

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

  async getPropertyDetails(req, res) {
    try {
      const { propertyId } = req.params;
      const { userIdentifier } = req.query;

      console.log(`🔍 Fetching property details: ${propertyId}`);

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      if (userIdentifier) {
        await property.trackView(userIdentifier);
      }

      let hasAccreditation = false;
      let hasJurisdiction = false;

      if (userIdentifier) {
        if (property.requiresAccreditation) {
          const accreditationProof = await Proof.findOne({
            userIdentifier,
            type: 'accreditation',
            verified: true,
            threshold: { $gte: property.accreditationThreshold },
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          hasAccreditation = !!accreditationProof;
        } else {
          hasAccreditation = true;
        }

        if (property.requiresJurisdiction) {
          const jurisdictionProof = await Proof.findOne({
            userIdentifier,
            type: 'jurisdiction',
            verified: true,
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          hasJurisdiction = !!jurisdictionProof;
        } else {
          hasJurisdiction = true;
        }
      }

      const details = property.getDetailsForUser(hasAccreditation, hasJurisdiction);

      details.userCompliance = {
        hasAccreditation,
        hasJurisdiction,
        canMakeOffer: hasAccreditation && hasJurisdiction
      };

      details.consumeStatus = property.consumeStatus;
      details.readyForSettlement = property.isReadyForSettlement();

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

      const ownedProperties = properties.map(p => ({
        propertyId: p.propertyId,
        status: p.status,
        consumeStatus: p.consumeStatus,
        readyForSettlement: p.isReadyForSettlement(),
        price: p.price,
        listedAt: p.listedAt,
        metadata: p.metadata,
        midenNoteId: p.midenNoteId,
        midenTransactionId: p.midenTransactionId,
        consumeTransactionId: p.consumeTransactionId,
        views: p.views,
        uniqueViewers: p.uniqueViewers.length,
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
          status: property.status,
          consumeStatus: property.consumeStatus,
          readyForSettlement: property.isReadyForSettlement(),
          price: property.price,
          metadata: property.metadata,
          midenNoteId: property.midenNoteId,
          midenTransactionId: property.midenTransactionId,
          consumeTransactionId: property.consumeTransactionId,
          views: property.views,
          uniqueViewers: property.uniqueViewers.length,
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