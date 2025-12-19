// File: backend/src/controllers/offerController.js
// Business logic for offer management WITH ZK PROOF ENFORCEMENT + AUTO BOB FUNDING
// ENHANCED VERSION: Auto-funds Bob when he creates an offer

const Property = require('../models/Property');
const Offer = require('../models/Offer');
const Proof = require('../models/Proof');
const midenClient = require('../services/midenClient');

class OfferController {
  // Create new offer (WITH PROOF ENFORCEMENT + AUTO FUNDING!)
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

      // ============================================================================
      // 💰 AUTO-FUND BOB: Mint and consume tokens for the buyer
      // ============================================================================
      
      console.log(`💰 Auto-funding buyer (Bob) with tokens for escrow...`);
      
      let fundingResult = null;
      try {
        // Step 1: Mint tokens for Bob (amount = offer price + buffer)
        const mintAmount = Math.ceil(offerPrice * 1.1); // 10% buffer
        console.log(`   Minting ${mintAmount} tokens for buyer...`);
        
        const mintResult = await midenClient.createPropertyToken(
          {
            id: `FUNDING-${Date.now()}`,
            ipfsCid: 'QmBuyerFunding',
            type: 'token',
            price: mintAmount
          },
          'bob' // Always mint to bob for demo
        );

        console.log(`✅ Tokens minted: ${mintResult.noteId}`);
        console.log(`   TX: ${mintResult.transactionId}`);

        // Step 2: Consume the note into Bob's vault
        console.log(`   Consuming tokens into buyer's vault...`);
        
        const consumeResult = await midenClient.consumeNote(
          mintResult.noteId,
          'bob' // Consume to bob's account
        );

        console.log(`✅ Tokens consumed into vault: ${consumeResult.transactionId}`);

        fundingResult = {
          mintTxId: mintResult.transactionId,
          mintNoteId: mintResult.noteId,
          consumeTxId: consumeResult.transactionId,
          amount: mintAmount,
          timestamp: new Date()
        };

        console.log(`💰 Buyer successfully funded with ${mintAmount} tokens!`);

      } catch (fundingError) {
        console.error('⚠️  Auto-funding failed:', fundingError.message);
        console.log('   Offer will be created, but buyer may need manual funding');
        
        // Don't fail the offer creation, just log the warning
        fundingResult = {
          failed: true,
          error: fundingError.message,
          timestamp: new Date()
        };
      }

      // ============================================================================
      // CREATE OFFER
      // ============================================================================

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
        verifiedProofs, // Store proof references
        buyerFunding: fundingResult // Store funding info
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
        },
        funding: fundingResult?.failed ? {
          status: 'failed',
          message: 'Auto-funding failed. Manual funding may be required.',
          error: fundingResult.error
        } : {
          status: 'success',
          message: 'Buyer automatically funded with tokens',
          mintTxId: fundingResult.mintTxId,
          consumeTxId: fundingResult.consumeTxId,
          amount: fundingResult.amount
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
          buyerFunded: o.buyerFunding && !o.buyerFunding.failed,
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
          buyerFunded: o.buyerFunding && !o.buyerFunding.failed,
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
          buyerFunded: o.buyerFunding && !o.buyerFunding.failed,
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

  // Accept offer (creates AND funds blockchain escrow) - WITH RE-VERIFICATION
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

      // ============================================================================
      // CHECK IF BUYER WAS AUTO-FUNDED
      // ============================================================================
      
      if (offer.buyerFunding?.failed) {
        console.log(`⚠️  Buyer was not auto-funded. Attempting manual funding...`);
        
        try {
          // Retry funding now that we're accepting the offer
          const mintAmount = Math.ceil(offer.offerPrice * 1.1);
          
          const mintResult = await midenClient.createPropertyToken(
            {
              id: `FUNDING-RETRY-${Date.now()}`,
              ipfsCid: 'QmBuyerFundingRetry',
              type: 'token',
              price: mintAmount
            },
            'bob'
          );

          const consumeResult = await midenClient.consumeNote(
            mintResult.noteId,
            'bob'
          );

          offer.buyerFunding = {
            mintTxId: mintResult.transactionId,
            mintNoteId: mintResult.noteId,
            consumeTxId: consumeResult.transactionId,
            amount: mintAmount,
            timestamp: new Date(),
            retried: true
          };

          console.log(`✅ Buyer funding retry successful!`);
        } catch (retryError) {
          console.error('❌ Funding retry also failed:', retryError.message);
          return res.status(500).json({
            success: false,
            error: 'Cannot accept offer: Buyer funding failed',
            details: retryError.message,
            suggestion: 'Please ensure buyer has sufficient funds before accepting'
          });
        }
      }

      // ============================================================================
      // STEP 1: CREATE ESCROW
      // ============================================================================
      
      console.log(`🔒 Creating escrow with hex IDs:`);
      console.log(`   Buyer:  ${offer.buyerAccountId}`);
      console.log(`   Seller: ${offer.sellerAccountId}`);
      console.log(`   Amount: ${offer.offerPrice}`);

      const escrowResult = await midenClient.createEscrow(
        offer.buyerAccountId,
        offer.sellerAccountId,
        offer.offerPrice
      );

      console.log(`✅ Escrow created: ${escrowResult.escrowAccountId}`);

      // ============================================================================
      // STEP 2: FUND THE ESCROW IMMEDIATELY
      // ============================================================================
      
      console.log(`💰 Funding escrow with ${offer.offerPrice}...`);
      
      let fundResult;
      try {
        fundResult = await midenClient.fundEscrow({
          escrowAccountId: escrowResult.escrowAccountId,
          buyerAccountId: offer.buyerAccountId,
          sellerAccountId: offer.sellerAccountId,
          amount: offer.offerPrice
        });
        
        console.log(`✅ Escrow funded! TX: ${fundResult.transactionId}`);
      } catch (fundError) {
        console.error('❌ Escrow funding failed:', fundError.message);
        throw new Error(`Escrow funding failed: ${fundError.message}`);
      }

      // ============================================================================
      // STEP 3: UPDATE OFFER
      // ============================================================================

      offer.status = 'accepted';
      offer.escrowId = escrowResult.escrowAccountId || escrowResult.escrow_id;
      offer.escrowFundingTxId = fundResult.transactionId;
      offer.acceptedAt = new Date();
      await offer.save();

      res.json({
        success: true,
        message: 'Offer accepted - escrow created and funded ✅',
        offer: {
          offerId: offer.offerId,
          status: offer.status,
          escrowId: offer.escrowId,
          escrowFundingTxId: offer.escrowFundingTxId,
          acceptedAt: offer.acceptedAt,
          complianceVerified: true
        },
        escrow: {
          ...escrowResult,
          status: 'funded',
          fundingTx: fundResult.transactionId
        },
        funding: {
          status: 'success',
          autoFunded: !offer.buyerFunding?.retried,
          mintTxId: offer.buyerFunding?.mintTxId,
          consumeTxId: offer.buyerFunding?.consumeTxId
        }
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
          buyerFunded: offer.buyerFunding && !offer.buyerFunding.failed,
          buyerFunding: offer.buyerFunding,
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

  // Check if buyer can make offer (compliance pre-check)
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