// File: backend/src/controllers/proofController.js
// Complete working version with all methods

const Proof = require('../models/Proof');
const ProofEvent = require('../models/ProofEvent');
const midenClient = require('../services/midenClient');
const crypto = require('crypto');

class ProofController {
  
  // ============================================================================
  // ACCREDITATION PROOFS
  // ============================================================================
  
  async generateAccreditationProof(req, res) {
    try {
      const { netWorth, threshold, userIdentifier } = req.body;

      if (!netWorth || !threshold || !userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: netWorth, threshold, userIdentifier'
        });
      }

      console.log(`🔐 Generating accreditation proof for user: ${userIdentifier}`);
      console.log(`Net worth: $${netWorth}, Threshold: $${threshold}`);

      // Call Rust service to generate ZK proof
      const proofResult = await midenClient.generateAccreditationProof(
        netWorth,
        threshold
      );

      const verified = proofResult.verified || false;

      // Store proof in MongoDB
      const proof = new Proof({
        proofId: crypto.randomBytes(16).toString('hex'),
        userIdentifier,
        type: 'accreditation',
        proofData: JSON.stringify(proofResult),
        verified,
        threshold,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      });

      await proof.save();

      // Log event for transparency
      const proofHash = crypto.createHash('sha256').update(JSON.stringify(proofResult)).digest('hex');
      await ProofEvent.logProofGeneration('accreditation', userIdentifier, proof.proofId, proofHash);

      console.log(`✅ Accreditation proof generated: ${verified ? 'VERIFIED' : 'FAILED'}`);

      res.status(201).json({
        success: true,
        message: verified ? 'Accreditation proof generated successfully ✅' : 'Proof generated but verification failed ❌',
        proof: {
          proofId: proof.proofId,
          type: proof.type,
          verified: proof.verified,
          threshold: proof.threshold,
          createdAt: proof.createdAt,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      console.error('Generate accreditation proof error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate accreditation proof',
        details: error.message
      });
    }
  }

  async getMyProofs(req, res) {
    try {
      const { userIdentifier } = req.query;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required'
        });
      }

      const proofs = await Proof.find({ userIdentifier }).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: proofs.length,
        proofs: proofs.map(p => ({
          proofId: p.proofId,
          type: p.type,
          verified: p.verified,
          threshold: p.threshold,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt
        }))
      });

    } catch (error) {
      console.error('Get proofs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve proofs'
      });
    }
  }

  async checkProofRequirement(req, res) {
    try {
      const { userIdentifier, requiredThreshold } = req.body;

      if (!userIdentifier || !requiredThreshold) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const proof = await Proof.findOne({
        userIdentifier,
        type: 'accreditation',
        verified: true,
        threshold: { $gte: requiredThreshold },
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        hasValidProof: !!proof,
        proof: proof ? {
          proofId: proof.proofId,
          threshold: proof.threshold,
          expiresAt: proof.expiresAt
        } : null
      });

    } catch (error) {
      console.error('Check proof requirement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check proof requirement'
      });
    }
  }

  async getProofById(req, res) {
    try {
      const { proofId } = req.params;

      const proof = await Proof.findOne({ proofId });

      if (!proof) {
        return res.status(404).json({
          success: false,
          error: 'Proof not found'
        });
      }

      res.json({
        success: true,
        proof: {
          proofId: proof.proofId,
          type: proof.type,
          verified: proof.verified,
          threshold: proof.threshold,
          createdAt: proof.createdAt,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      console.error('Get proof by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve proof'
      });
    }
  }

  async clearAllProofs(req, res) {
    try {
      await Proof.deleteMany({});
      await ProofEvent.deleteMany({});

      res.json({
        success: true,
        message: 'All proofs and events cleared'
      });

    } catch (error) {
      console.error('Clear proofs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear proofs'
      });
    }
  }

  // ============================================================================
  // JURISDICTION PROOFS
  // ============================================================================

  async generateJurisdictionProof(req, res) {
    try {
      const { countryCode, restrictedCountries, userIdentifier } = req.body;

      if (!countryCode || !restrictedCountries || !userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: countryCode, restrictedCountries, userIdentifier'
        });
      }

      console.log(`🌍 Generating jurisdiction proof for user: ${userIdentifier}`);
      console.log(`Country: ${countryCode}, Restricted: ${restrictedCountries.join(', ')}`);

      // Call Rust service to generate ZK proof
      const proofResult = await midenClient.generateJurisdictionProof(
        countryCode,
        restrictedCountries
      );

      const verified = proofResult.verified || false;

      // Store proof in MongoDB
      const proof = new Proof({
        proofId: crypto.randomBytes(16).toString('hex'),
        userIdentifier,
        type: 'jurisdiction',
        proofData: JSON.stringify(proofResult),
        verified,
        restrictedCountries,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });

      await proof.save();

      // Log event
      const proofHash = crypto.createHash('sha256').update(JSON.stringify(proofResult)).digest('hex');
      await ProofEvent.logProofGeneration('jurisdiction', userIdentifier, proof.proofId, proofHash);

      console.log(`✅ Jurisdiction proof generated: ${verified ? 'VERIFIED' : 'FAILED'}`);

      res.status(201).json({
        success: true,
        message: verified ? 'Jurisdiction proof generated successfully ✅' : 'Proof generated but verification failed ❌',
        proof: {
          proofId: proof.proofId,
          type: proof.type,
          verified: proof.verified,
          restrictedCountries: proof.restrictedCountries,
          createdAt: proof.createdAt,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      console.error('Generate jurisdiction proof error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate jurisdiction proof',
        details: error.message
      });
    }
  }

  async getJurisdictionProofs(req, res) {
    try {
      const { userIdentifier } = req.query;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required'
        });
      }

      const proofs = await Proof.find({
        userIdentifier,
        type: 'jurisdiction'
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: proofs.length,
        proofs: proofs.map(p => ({
          proofId: p.proofId,
          verified: p.verified,
          restrictedCountries: p.restrictedCountries,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt
        }))
      });

    } catch (error) {
      console.error('Get jurisdiction proofs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve jurisdiction proofs'
      });
    }
  }

  async checkJurisdictionRequirement(req, res) {
    try {
      const { userIdentifier } = req.body;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required'
        });
      }

      const proof = await Proof.findOne({
        userIdentifier,
        type: 'jurisdiction',
        verified: true,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        hasValidProof: !!proof,
        proof: proof ? {
          proofId: proof.proofId,
          restrictedCountries: proof.restrictedCountries,
          expiresAt: proof.expiresAt
        } : null
      });

    } catch (error) {
      console.error('Check jurisdiction requirement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check jurisdiction requirement'
      });
    }
  }

  // ============================================================================
  // OWNERSHIP PROOFS
  // ============================================================================

  async generateOwnershipProof(req, res) {
    try {
      const { propertyId, documentHash, userIdentifier } = req.body;

      if (!propertyId || !documentHash || !userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: propertyId, documentHash, userIdentifier'
        });
      }

      console.log(`🔐 Generating ownership proof for property: ${propertyId}`);

      // For POC: Simple hash verification
      const expectedHash = crypto.createHash('sha256')
        .update(`${propertyId}-ownership`)
        .digest('hex');

      const proofData = {
        propertyId,
        documentHashProvided: documentHash,
        expectedHash,
        matches: documentHash === expectedHash,
        timestamp: new Date().toISOString()
      };

      const verified = proofData.matches || false;

      // Store proof
      const proof = new Proof({
        proofId: crypto.randomBytes(16).toString('hex'),
        userIdentifier,
        type: 'ownership',
        proofData: JSON.stringify(proofData),
        verified,
        propertyId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });

      await proof.save();

      // Log event
      const proofHash = crypto.createHash('sha256').update(JSON.stringify(proofData)).digest('hex');
      await ProofEvent.logProofGeneration('ownership', userIdentifier, proof.proofId, proofHash);

      console.log(`✅ Ownership proof generated: ${verified ? 'VALID' : 'INVALID'}`);

      res.status(201).json({
        success: true,
        message: verified ? 'Ownership proof generated and verified ✅' : 'Ownership proof generated but verification failed ❌',
        proof: {
          proofId: proof.proofId,
          type: proof.type,
          verified: proof.verified,
          propertyId: proof.propertyId,
          createdAt: proof.createdAt,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      console.error('Generate ownership proof error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate ownership proof',
        details: error.message
      });
    }
  }

  async verifyOwnershipProof(req, res) {
    try {
      const { proofId } = req.body;

      if (!proofId) {
        return res.status(400).json({
          success: false,
          error: 'Proof ID is required'
        });
      }

      const proof = await Proof.findOne({ proofId, type: 'ownership' });

      if (!proof) {
        return res.status(404).json({
          success: false,
          error: 'Ownership proof not found'
        });
      }

      const isExpired = new Date() > new Date(proof.expiresAt);
      const proofHash = crypto.createHash('sha256').update(proof.proofData).digest('hex');
      
      await ProofEvent.logProofVerification(
        'ownership',
        proof.userIdentifier,
        proof.proofId,
        proof.verified && !isExpired,
        proofHash
      );

      res.json({
        success: true,
        verification: {
          proofId: proof.proofId,
          verified: proof.verified,
          expired: isExpired,
          valid: proof.verified && !isExpired,
          propertyId: proof.propertyId,
          createdAt: proof.createdAt,
          expiresAt: proof.expiresAt
        }
      });

    } catch (error) {
      console.error('Verify ownership proof error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify ownership proof',
        details: error.message
      });
    }
  }

  // ============================================================================
  // DASHBOARD APIS
  // ============================================================================

  async getPublicProofEvents(req, res) {
    try {
      const { proofType, limit = 50, page = 1 } = req.query;

      const query = {};
      if (proofType) query.proofType = proofType;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const events = await ProofEvent.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');

      const total = await ProofEvent.countDocuments(query);

      res.json({
        success: true,
        count: events.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        events: events.map(e => ({
          eventId: e.eventId,
          type: e.type,
          proofType: e.proofType,
          userHash: e.userHash,
          verified: e.verified,
          timestamp: e.timestamp,
          proofHash: e.proofHash
        }))
      });

    } catch (error) {
      console.error('Get public proof events error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve proof events',
        details: error.message
      });
    }
  }

  async getMyProofHistory(req, res) {
    try {
      const { userIdentifier } = req.query;

      if (!userIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required'
        });
      }

      const proofs = await Proof.find({ userIdentifier }).sort({ createdAt: -1 });

      const now = new Date();
      const activeProofs = proofs.filter(p => p.verified && new Date(p.expiresAt) > now);
      const expiredProofs = proofs.filter(p => new Date(p.expiresAt) <= now);

      const history = proofs.map(p => {
        const isExpired = new Date(p.expiresAt) <= now;
        const daysUntilExpiry = isExpired ? 0 : Math.ceil((new Date(p.expiresAt) - now) / (1000 * 60 * 60 * 24));

        return {
          proofId: p.proofId,
          type: p.type,
          status: p.verified ? (isExpired ? 'expired' : 'verified') : 'invalid',
          createdAt: p.createdAt,
          expiresAt: p.expiresAt,
          isValid: p.verified && !isExpired,
          daysUntilExpiry,
          propertyId: p.propertyId || null,
          ...(p.type === 'accreditation' && { threshold: p.threshold }),
          ...(p.type === 'jurisdiction' && { restrictedCount: p.restrictedCountries?.length })
        };
      });

      res.json({
        success: true,
        summary: {
          total: proofs.length,
          active: activeProofs.length,
          expired: expiredProofs.length,
          byType: {
            accreditation: proofs.filter(p => p.type === 'accreditation').length,
            jurisdiction: proofs.filter(p => p.type === 'jurisdiction').length,
            ownership: proofs.filter(p => p.type === 'ownership').length
          }
        },
        history
      });

    } catch (error) {
      console.error('Get proof history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve proof history',
        details: error.message
      });
    }
  }

  async getProofVerificationResult(req, res) {
    try {
      const { proofId } = req.params;

      const proof = await Proof.findOne({ proofId });

      if (!proof) {
        return res.status(404).json({
          success: false,
          error: 'Proof not found'
        });
      }

      const isExpired = new Date() > new Date(proof.expiresAt);
      const proofHash = crypto.createHash('sha256').update(proof.proofData).digest('hex');
      const userHash = crypto.createHash('sha256').update(proof.userIdentifier).digest('hex').substring(0, 16);

      res.json({
        success: true,
        verification: {
          proofId: proof.proofId,
          type: proof.type,
          verified: proof.verified,
          expired: isExpired,
          valid: proof.verified && !isExpired,
          verifiedAt: proof.createdAt,
          expiresAt: proof.expiresAt,
          proofHash,
          userHash
        }
      });

    } catch (error) {
      console.error('Get proof verification result error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification result',
        details: error.message
      });
    }
  }

  async getProofStatistics(req, res) {
    try {
      const totalProofs = await Proof.countDocuments();
      const verifiedProofs = await Proof.countDocuments({ verified: true });
      const activeProofs = await Proof.countDocuments({ 
        verified: true, 
        expiresAt: { $gt: new Date() } 
      });

      const proofsByType = await Proof.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            verified: { $sum: { $cond: ['$verified', 1, 0] } }
          }
        }
      ]);

      const eventsByType = await ProofEvent.aggregate([
        {
          $group: {
            _id: { type: '$type', proofType: '$proofType' },
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        statistics: {
          total: totalProofs,
          verified: verifiedProofs,
          active: activeProofs,
          expired: verifiedProofs - activeProofs,
          byType: proofsByType.reduce((acc, item) => {
            acc[item._id] = {
              total: item.count,
              verified: item.verified
            };
            return acc;
          }, {}),
          events: eventsByType.reduce((acc, item) => {
            const key = `${item._id.proofType}_${item._id.type}`;
            acc[key] = item.count;
            return acc;
          }, {})
        }
      });

    } catch (error) {
      console.error('Get proof statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate statistics',
        details: error.message
      });
    }
  }
}

module.exports = new ProofController();