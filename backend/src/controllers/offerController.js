// File: backend/src/controllers/offerController.js
// Business logic for offer management WITH ZK PROOF ENFORCEMENT

const Property = require('../models/Property');
const Offer = require('../models/Offer');
const Proof = require('../models/Proof');

/**
 * Map account hex IDs to names that Rust service expects for escrow creation
 * CREATE escrow expects names ("alice", "faucet")
 * FUND/RELEASE escrow accepts hex IDs
 */
function getAccountName(accountId) {
  const accountMap = {
    '0xe5338a1599d89110235dc6dbed059b': 'alice',
    '0xc3f051797dd19b200823b24faaa4e9': 'faucet'
  };
  
  return accountMap[accountId.toLowerCase()] || accountId;
}

class OfferController {
  // Create new offer (WITH PROOF ENFORCEMENT!)
  async createOffer(req, res) {
    try {
      const { propertyId, buyerAccountId, sellerAccountId, offerPrice, message, userIdentifier } = req.body;

      // Validate required fields
      if (!propertyId || !buyerAccountId || !sellerAccountId || !offerPrice) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if property exists and is verified
      const property = await Property.findOne({ propertyId });
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      if (property.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          error: 'Cannot make offers on unverified properties',
          propertyStatus: property.verificationStatus
        });
      }

      // ============================================================================
      // 🔐 COMPLIANCE CHECK: Verify buyer has required proofs
      // ============================================================================
      
      const missingProofs = [];
      const verifiedProofs = {};
      
      // Check 1: Accreditation proof (if property requires it)
      if (property.requiresAccreditation) {
        console.log(`🔍 Checking accreditation proof for buyer: ${userIdentifier || buyerAccountId}`);
        
        const accreditationProof = await Proof.findOne({
          userIdentifier: userIdentifier || buyerAccountId,
          type: 'accreditation',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!accreditationProof) {
          missingProofs.push({
            type: 'accreditation',
            message: 'Valid accreditation proof required',
            requiredThreshold: property.accreditationThreshold || 1000000
          });
        } else {
          // Check if proof meets property's threshold
          if (property.accreditationThreshold && accreditationProof.threshold < property.accreditationThreshold) {
            missingProofs.push({
              type: 'accreditation',
              message: `Accreditation proof threshold too low`,
              required: property.accreditationThreshold,
              current: accreditationProof.threshold
            });
          } else {
            console.log(`✅ Accreditation proof valid: threshold ${accreditationProof.threshold}`);
            verifiedProofs.accreditation = {
              proofId: accreditationProof._id,
              threshold: accreditationProof.threshold,
              expiresAt: accreditationProof.expiresAt
            };
          }
        }
      }

      // Check 2: Jurisdiction proof (if property requires it)
      if (property.requiresJurisdiction) {
        console.log(`🔍 Checking jurisdiction proof for buyer: ${userIdentifier || buyerAccountId}`);
        
        const jurisdictionProof = await Proof.findOne({
          userIdentifier: userIdentifier || buyerAccountId,
          type: 'jurisdiction',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!jurisdictionProof) {
          missingProofs.push({
            type: 'jurisdiction',
            message: 'Valid jurisdiction proof required',
            restrictedCountries: property.restrictedCountries || []
          });
        } else {
          console.log(`✅ Jurisdiction proof valid`);
          verifiedProofs.jurisdiction = {
            proofId: jurisdictionProof._id,
            restrictedCount: jurisdictionProof.threshold,
            expiresAt: jurisdictionProof.expiresAt
          };
        }
      }

      // If any proofs are missing, reject the offer
      if (missingProofs.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Buyer does not meet compliance requirements',
          missingProofs,
          propertyRequirements: {
            requiresAccreditation: property.requiresAccreditation,
            accreditationThreshold: property.accreditationThreshold,
            requiresJurisdiction: property.requiresJurisdiction,
            restrictedCountries: property.restrictedCountries
          },
          message: 'Please generate required proofs before making an offer',
          howToComply: {
            accreditation: missingProofs.find(p => p.type === 'accreditation') 
              ? 'POST /api/v1/proofs/generate-accreditation'
              : null,
            jurisdiction: missingProofs.find(p => p.type === 'jurisdiction')
              ? 'POST /api/v1/proofs/generate-jurisdiction'
              : null
          }
        });
      }

      console.log(`✅ All compliance checks passed for buyer: ${userIdentifier || buyerAccountId}`);

      // Create offer with verified proof references
      const offerId = `OFFER-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const offer = new Offer({
        offerId,
        propertyId,
        buyerAccountId,
        sellerAccountId,
        offerPrice,
        message,
        status: 'pending',
        expiresAt,
        buyerUserIdentifier: userIdentifier || buyerAccountId,
        verifiedProofs // Store proof references
      });

      await offer.save();

      res.status(201).json({
        success: true,
        message: 'Offer created successfully - all compliance requirements met ✅',
        offer: {
          offerId: offer.offerId,
          propertyId: offer.propertyId,
          buyerAccountId: offer.buyerAccountId,
          sellerAccountId: offer.sellerAccountId,
          offerPrice: offer.offerPrice,
          status: offer.status,
          expiresAt: offer.expiresAt,
          createdAt: offer.createdAt
        },
        compliance: {
          accreditationVerified: property.requiresAccreditation ? true : 'not required',
          jurisdictionVerified: property.requiresJurisdiction ? true : 'not required',
          proofDetails: verifiedProofs
        }
      });
    } catch (error) {
      console.error('Create offer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create offer',
        details: error.message
      });
    }
  }

  // Get offers for a property
  async getPropertyOffers(req, res) {
    try {
      const { propertyId } = req.params;
      const { status } = req.query;

      const query = { propertyId };
      if (status) {
        query.status = status;
      }

      const offers = await Offer.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: offers.length,
        offers: offers.map(o => ({
          offerId: o.offerId,
          propertyId: o.propertyId,
          buyerAccountId: o.buyerAccountId,
          sellerAccountId: o.sellerAccountId,
          offerPrice: o.offerPrice,
          status: o.status,
          escrowId: o.escrowId,
          complianceVerified: o.verifiedProofs ? true : false,
          createdAt: o.createdAt,
          expiresAt: o.expiresAt
        }))
      });
    } catch (error) {
      console.error('Get property offers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve offers'
      });
    }
  }

  // Get offers made by buyer
  async getBuyerOffers(req, res) {
    try {
      const { buyerId } = req.params;
      const { status } = req.query;

      const query = { buyerAccountId: buyerId };
      if (status) {
        query.status = status;
      }

      const offers = await Offer.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: offers.length,
        offers: offers.map(o => ({
          offerId: o.offerId,
          propertyId: o.propertyId,
          buyerAccountId: o.buyerAccountId,
          sellerAccountId: o.sellerAccountId,
          offerPrice: o.offerPrice,
          status: o.status,
          escrowId: o.escrowId,
          complianceVerified: o.verifiedProofs ? true : false,
          createdAt: o.createdAt
        }))
      });
    } catch (error) {
      console.error('Get buyer offers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve buyer offers'
      });
    }
  }

  // Get offers received by seller
  async getSellerOffers(req, res) {
    try {
      const { sellerId } = req.params;
      const { status } = req.query;

      const query = { sellerAccountId: sellerId };
      if (status) {
        query.status = status;
      }

      const offers = await Offer.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: offers.length,
        offers: offers.map(o => ({
          offerId: o.offerId,
          propertyId: o.propertyId,
          buyerAccountId: o.buyerAccountId,
          sellerAccountId: o.sellerAccountId,
          offerPrice: o.offerPrice,
          status: o.status,
          escrowId: o.escrowId,
          complianceVerified: o.verifiedProofs ? true : false,
          createdAt: o.createdAt
        }))
      });
    } catch (error) {
      console.error('Get seller offers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller offers'
      });
    }
  }

  // Accept offer (creates blockchain escrow) - WITH RE-VERIFICATION
  async acceptOffer(req, res) {
    try {
      const { offerId } = req.params;

      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        return res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      }

      if (offer.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Offer is not pending',
          currentStatus: offer.status
        });
      }

      // ============================================================================
      // 🔐 RE-VERIFY PROOFS: Ensure buyer still has valid proofs
      // ============================================================================
      
      const property = await Property.findOne({ propertyId: offer.propertyId });
      
      if (property && (property.requiresAccreditation || property.requiresJurisdiction)) {
        console.log(`🔍 Re-verifying buyer compliance before accepting offer...`);
        
        const missingProofs = [];
        
        // Re-check accreditation
        if (property.requiresAccreditation) {
          const accreditationProof = await Proof.findOne({
            userIdentifier: offer.buyerUserIdentifier || offer.buyerAccountId,
            type: 'accreditation',
            verified: true,
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          if (!accreditationProof) {
            missingProofs.push('accreditation');
          }
        }

        // Re-check jurisdiction
        if (property.requiresJurisdiction) {
          const jurisdictionProof = await Proof.findOne({
            userIdentifier: offer.buyerUserIdentifier || offer.buyerAccountId,
            type: 'jurisdiction',
            verified: true,
            expiresAt: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          if (!jurisdictionProof) {
            missingProofs.push('jurisdiction');
          }
        }

        if (missingProofs.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'Buyer no longer meets compliance requirements',
            expiredProofs: missingProofs,
            message: 'Buyer must regenerate proofs before offer can be accepted'
          });
        }

        console.log(`✅ Buyer compliance re-verified successfully`);
      }

      // Map hex IDs to account names for escrow creation
      const buyerName = getAccountName(offer.buyerAccountId);
      const sellerName = getAccountName(offer.sellerAccountId);
      
      console.log(`🔒 Creating escrow: buyer=${buyerName}, seller=${sellerName}, amount=${offer.offerPrice}`);

      // Create blockchain escrow
      const midenClient = require('../services/midenClient');
      const escrowResult = await midenClient.createEscrow(
        buyerName,      // ✅ Pass account name instead of hex ID
        sellerName,     // ✅ Pass account name instead of hex ID
        offer.offerPrice
      );

      // Update offer
      offer.status = 'accepted';
      offer.escrowId = escrowResult.escrow_id;
      offer.acceptedAt = new Date();
      await offer.save();

      res.json({
        success: true,
        message: 'Offer accepted - compliance verified ✅',
        offer: {
          offerId: offer.offerId,
          status: offer.status,
          escrowId: offer.escrowId,
          acceptedAt: offer.acceptedAt,
          complianceVerified: true
        },
        escrow: escrowResult
      });
    } catch (error) {
      console.error('Accept offer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to accept offer',
        details: error.message
      });
    }
  }

  // Reject offer
  async rejectOffer(req, res) {
    try {
      const { offerId } = req.params;
      const { reason } = req.body;

      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        return res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      }

      if (offer.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Offer is not pending',
          currentStatus: offer.status
        });
      }

      offer.status = 'rejected';
      offer.rejectedAt = new Date();
      if (reason) {
        offer.message = reason;
      }
      await offer.save();

      res.json({
        success: true,
        message: 'Offer rejected',
        offer: {
          offerId: offer.offerId,
          status: offer.status,
          rejectedAt: offer.rejectedAt
        }
      });
    } catch (error) {
      console.error('Reject offer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject offer'
      });
    }
  }

  // Get single offer by ID
  async getOfferById(req, res) {
    try {
      const { offerId } = req.params;

      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        return res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      }

      res.json({
        success: true,
        offer: {
          offerId: offer.offerId,
          propertyId: offer.propertyId,
          buyerAccountId: offer.buyerAccountId,
          sellerAccountId: offer.sellerAccountId,
          offerPrice: offer.offerPrice,
          status: offer.status,
          escrowId: offer.escrowId,
          message: offer.message,
          complianceVerified: offer.verifiedProofs ? true : false,
          verifiedProofs: offer.verifiedProofs,
          createdAt: offer.createdAt,
          acceptedAt: offer.acceptedAt,
          rejectedAt: offer.rejectedAt,
          expiresAt: offer.expiresAt
        }
      });
    } catch (error) {
      console.error('Get offer error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve offer'
      });
    }
  }

  // NEW: Check if buyer can make offer (compliance pre-check)
  async checkBuyerEligibility(req, res) {
    try {
      const { propertyId, userIdentifier } = req.query;

      if (!propertyId || !userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'Missing propertyId or userIdentifier'
        });
      }

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const eligibility = {
        canMakeOffer: true,
        requirements: [],
        missingProofs: []
      };

      // Check accreditation
      if (property.requiresAccreditation) {
        const accreditationProof = await Proof.findOne({
          userIdentifier,
          type: 'accreditation',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!accreditationProof) {
          eligibility.canMakeOffer = false;
          eligibility.missingProofs.push('accreditation');
        }

        eligibility.requirements.push({
          type: 'accreditation',
          required: true,
          threshold: property.accreditationThreshold,
          status: accreditationProof ? 'verified' : 'missing'
        });
      }

      // Check jurisdiction
      if (property.requiresJurisdiction) {
        const jurisdictionProof = await Proof.findOne({
          userIdentifier,
          type: 'jurisdiction',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!jurisdictionProof) {
          eligibility.canMakeOffer = false;
          eligibility.missingProofs.push('jurisdiction');
        }

        eligibility.requirements.push({
          type: 'jurisdiction',
          required: true,
          restrictedCountries: property.restrictedCountries,
          status: jurisdictionProof ? 'verified' : 'missing'
        });
      }

      res.json({
        success: true,
        eligibility,
        message: eligibility.canMakeOffer 
          ? 'Buyer meets all requirements ✅'
          : 'Buyer must generate missing proofs before making offer'
      });
    } catch (error) {
      console.error('Check buyer eligibility error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check eligibility'
      });
    }
  }
}

module.exports = new OfferController();