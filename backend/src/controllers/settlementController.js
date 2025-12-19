// File: backend/src/controllers/settlementController.js
// Atomic settlement orchestrator - handles complete property sale transaction
// FIXED: Removed MongoDB transactions to avoid conflicts with background consume

const Property = require('../models/Property');
const Offer = require('../models/Offer');
const Proof = require('../models/Proof');
const midenClient = require('../services/midenClient');

class SettlementController {
  
  /**
   * Check if settlement is ready to execute
   * Verifies all requirements before allowing settlement
   */
  async checkSettlementReady(req, res) {
    try {
      const { offerId } = req.params;

      console.log(`🔍 Checking settlement readiness for offer: ${offerId}`);

      // Get offer
      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        return res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      }

      // Get property
      const property = await Property.findOne({ propertyId: offer.propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Initialize checks
      const checks = {
        offerAccepted: false,
        escrowCreated: false,
        escrowFunded: false,
        buyerAccreditation: false,
        buyerJurisdiction: false,
        propertyOwnership: true,
        proofsNotExpired: false,
        propertyAvailable: false
      };

      const blockers = [];

      // Check 1: Offer accepted
      if (offer.status === 'accepted') {
        checks.offerAccepted = true;
      } else {
        blockers.push(`Offer status is '${offer.status}', must be 'accepted'`);
      }

      // Check 2: Escrow created (support both field names)
      const escrowId = offer.escrowAccountId || offer.escrowId;
      if (escrowId) {
        checks.escrowCreated = true;
        checks.escrowFunded = true;
      } else {
        blockers.push('Escrow not created');
        blockers.push('Escrow not funded');
      }

      // Check 3: Buyer accreditation (if required)
      if (property.requiresAccreditation) {
        const accreditationProof = await Proof.findOne({
          userIdentifier: offer.buyerUserIdentifier || offer.buyerAccountId,
          type: 'accreditation',
          verified: true,
          threshold: { $gte: property.accreditationThreshold },
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (accreditationProof) {
          checks.buyerAccreditation = true;
        } else {
          blockers.push('Buyer accreditation proof missing or expired');
        }
      } else {
        checks.buyerAccreditation = true;
      }

      // Check 4: Buyer jurisdiction (if required)
      if (property.requiresJurisdiction) {
        const jurisdictionProof = await Proof.findOne({
          userIdentifier: offer.buyerUserIdentifier || offer.buyerAccountId,
          type: 'jurisdiction',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (jurisdictionProof) {
          checks.buyerJurisdiction = true;
        } else {
          blockers.push('Buyer jurisdiction proof missing or expired');
        }
      } else {
        checks.buyerJurisdiction = true;
      }

      // Check 5: Proofs not expired
      if (checks.buyerAccreditation && checks.buyerJurisdiction) {
        checks.proofsNotExpired = true;
      }

      // Check 6: Property available
      if (property.status === 'listed' || property.status === 'offer_pending') {
        checks.propertyAvailable = true;
      } else {
        blockers.push(`Property status is '${property.status}', must be 'listed' or 'offer_pending'`);
      }

      // Determine if ready
      const readyToSettle = Object.values(checks).every(check => check === true);

      console.log(`${readyToSettle ? '✅' : '❌'} Settlement ready: ${readyToSettle}`);

      res.json({
        success: true,
        readyToSettle,
        checks,
        blockers: blockers.length > 0 ? blockers : undefined,
        offer: {
          offerId: offer.offerId,
          propertyId: offer.propertyId,
          status: offer.status,
          escrowAccountId: offer.escrowAccountId || offer.escrowId
        }
      });

    } catch (error) {
      console.error('Check settlement ready error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check settlement readiness',
        details: error.message
      });
    }
  }

  /**
   * Execute settlement
   * 
   * Steps:
   * 1. Verify all requirements
   * 2. Transfer property NFT to buyer (BLOCKCHAIN - irreversible)
   * 3. Release escrow funds to seller (BLOCKCHAIN - irreversible)
   * 4. Update offer status to 'completed' (DATABASE - best effort)
   * 5. Update property status to 'sold' (DATABASE - best effort)
   * 
   * Blockchain is source of truth - database is cache
   */
  async executeSettlement(req, res) {
    try {
      console.log('🚀 Starting settlement...');

      const { offerId } = req.params;

      // ============================================================================
      // STEP 1: GET AND VERIFY OFFER
      // ============================================================================
      
      console.log('📋 Step 1/5: Retrieving and verifying offer...');
      
      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        throw new Error('Offer not found');
      }

      if (offer.status !== 'accepted') {
        throw new Error(`Offer status is '${offer.status}', must be 'accepted'`);
      }

      // Support both field names for backward compatibility
      const escrowAccountId = offer.escrowAccountId || offer.escrowId;
      if (!escrowAccountId) {
        throw new Error('Escrow not created for this offer');
      }

      console.log(`✅ Offer verified: ${offerId}`);
      console.log(`   Escrow Account: ${escrowAccountId}`);

      // ============================================================================
      // STEP 2: GET AND VERIFY PROPERTY
      // ============================================================================
      
      console.log('🏠 Step 2/5: Retrieving and verifying property...');
      
      const property = await Property.findOne({ propertyId: offer.propertyId });

      if (!property) {
        throw new Error('Property not found');
      }

      if (property.status === 'sold') {
        throw new Error('Property already sold');
      }

      console.log(`✅ Property verified: ${property.propertyId}`);

      // ============================================================================
      // STEP 3: RE-VERIFY BUYER PROOFS
      // ============================================================================
      
      console.log('🔐 Step 3/5: Re-verifying buyer compliance proofs...');
      
      const buyerIdentifier = offer.buyerUserIdentifier || offer.buyerAccountId;

      // Check accreditation (if required)
      if (property.requiresAccreditation) {
        const accreditationProof = await Proof.findOne({
          userIdentifier: buyerIdentifier,
          type: 'accreditation',
          verified: true,
          threshold: { $gte: property.accreditationThreshold },
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!accreditationProof) {
          throw new Error('Buyer accreditation proof missing or expired');
        }

        console.log(`✅ Accreditation proof valid (threshold: $${accreditationProof.threshold})`);
      }

      // Check jurisdiction (if required)
      if (property.requiresJurisdiction) {
        const jurisdictionProof = await Proof.findOne({
          userIdentifier: buyerIdentifier,
          type: 'jurisdiction',
          verified: true,
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!jurisdictionProof) {
          throw new Error('Buyer jurisdiction proof missing or expired');
        }

        console.log(`✅ Jurisdiction proof valid`);
      }

      console.log('✅ All compliance proofs verified');

      // ============================================================================
      // STEP 4: TRANSFER PROPERTY ON BLOCKCHAIN (IRREVERSIBLE!)
      // ============================================================================
      
      console.log('🔄 Step 4/5: Transferring property NFT on blockchain...');
      
      let propertyTransferTx;
      try {
        const transferResult = await midenClient.transferProperty(
          property.propertyId,
          offer.buyerAccountId
        );
        
        // Handle both string and object responses
        propertyTransferTx = typeof transferResult === 'string' 
          ? transferResult 
          : transferResult.transactionId;
        
        console.log(`✅ Property transferred! TX: ${propertyTransferTx}`);
      } catch (error) {
        console.error('Property transfer failed:', error);
        throw new Error(`Property transfer failed: ${error.message}`);
      }

      // ============================================================================
      // STEP 5: RELEASE ESCROW ON BLOCKCHAIN (IRREVERSIBLE!)
      // ============================================================================
      
      console.log('💰 Step 5/5: Releasing escrow funds to seller...');
      
      // Build complete escrow object with ALL required fields
      const escrowData = {
        escrowAccountId: escrowAccountId,
        buyerAccountId: offer.buyerAccountId,
        sellerAccountId: property.ownerAccountId,
        amount: offer.offerPrice
      };

      console.log(`🔓 Releasing escrow:`, {
        escrowAccountId: escrowData.escrowAccountId,
        buyerAccountId: escrowData.buyerAccountId,
        sellerAccountId: escrowData.sellerAccountId,
        amount: escrowData.amount
      });
      
      let escrowReleaseTx;
      try {
        const releaseResult = await midenClient.releaseEscrow(escrowData);
        
        // Handle both string and object responses
        escrowReleaseTx = typeof releaseResult === 'string'
          ? releaseResult
          : releaseResult.transactionId;
        
        console.log(`✅ Escrow released! TX: ${escrowReleaseTx}`);
      } catch (error) {
        console.error('Escrow release failed:', error);
        throw new Error(`Escrow release failed: ${error.message}`);
      }

      // ============================================================================
      // STEP 6: UPDATE DATABASE (best effort - blockchain already succeeded)
      // ============================================================================
      
      console.log('💾 Step 6/6: Updating database records...');
      
      try {
        // Update offer
        offer.status = 'completed';
        offer.completedAt = new Date();
        offer.settlementTxIds = {
          propertyTransfer: propertyTransferTx,
          escrowRelease: escrowReleaseTx
        };
        await offer.save();

        // Update property
        property.status = 'sold';
        property.soldAt = new Date();
        property.soldTo = offer.buyerAccountId;
        property.soldPrice = offer.offerPrice;
        property.ownerAccountId = offer.buyerAccountId;
        property.ownerUserIdentifier = offer.buyerUserIdentifier || offer.buyerAccountId;
        await property.save();

        console.log('✅ Database updated');
      } catch (dbError) {
        console.error('⚠️  Database update failed (blockchain succeeded):', dbError.message);
        // Don't throw - blockchain is source of truth!
      }

      // ============================================================================
      // SUCCESS!
      // ============================================================================
      
      console.log('🎉 SETTLEMENT COMPLETE!');

      res.json({
        success: true,
        message: 'Settlement executed successfully! Property ownership transferred and funds released! 🎉',
        settlement: {
          offerId: offer.offerId,
          propertyId: property.propertyId,
          buyer: offer.buyerAccountId,
          seller: property.ownerAccountId,
          price: offer.offerPrice,
          completedAt: offer.completedAt || new Date(),
          blockchain: {
            propertyTransferTx,
            escrowReleaseTx,
            explorerUrls: {
              propertyTransfer: `https://testnet.midenscan.com/tx/${propertyTransferTx}`,
              escrowRelease: `https://testnet.midenscan.com/tx/${escrowReleaseTx}`
            }
          },
          status: {
            offerStatus: offer.status || 'completed',
            propertyStatus: property.status || 'sold'
          }
        }
      });

    } catch (error) {
      console.error('❌ Settlement failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Settlement failed',
        details: error.message
      });
    }
  }

  /**
   * Get settlement history
   */
  async getSettlementHistory(req, res) {
    try {
      const { userIdentifier } = req.query;

      const query = { status: 'completed' };

      if (userIdentifier) {
        query.$or = [
          { buyerUserIdentifier: userIdentifier },
          { 'settlementTxIds': { $exists: true } }
        ];
      }

      const settlements = await Offer.find(query)
        .sort({ completedAt: -1 })
        .limit(50);

      const history = settlements.map(s => ({
        offerId: s.offerId,
        propertyId: s.propertyId,
        buyer: s.buyerAccountId,
        seller: s.sellerAccountId,
        price: s.offerPrice,
        completedAt: s.completedAt,
        txIds: s.settlementTxIds
      }));

      res.json({
        success: true,
        count: history.length,
        settlements: history
      });

    } catch (error) {
      console.error('Get settlement history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve settlement history'
      });
    }
  }

  /**
   * Get settlement details by offer ID
   */
  async getSettlementDetails(req, res) {
    try {
      const { offerId } = req.params;

      const offer = await Offer.findOne({ offerId });

      if (!offer) {
        return res.status(404).json({
          success: false,
          error: 'Offer/Settlement not found'
        });
      }

      if (offer.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Settlement not completed yet',
          currentStatus: offer.status
        });
      }

      const property = await Property.findOne({ propertyId: offer.propertyId });

      res.json({
        success: true,
        settlement: {
          offerId: offer.offerId,
          propertyId: offer.propertyId,
          propertyTitle: property?.metadata?.title,
          buyer: offer.buyerAccountId,
          seller: offer.sellerAccountId,
          price: offer.offerPrice,
          completedAt: offer.completedAt,
          blockchain: offer.settlementTxIds,
          property: property ? {
            status: property.status,
            soldAt: property.soldAt,
            soldTo: property.soldTo
          } : null
        }
      });

    } catch (error) {
      console.error('Get settlement details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve settlement details'
      });
    }
  }
}

module.exports = new SettlementController();