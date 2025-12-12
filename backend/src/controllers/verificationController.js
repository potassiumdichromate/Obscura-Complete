// File: backend/src/controllers/verificationController.js
// Business logic for property verification

const Property = require('../models/Property');
const VerificationHistory = require('../models/VerificationHistory');

class VerificationController {
  // Get all pending properties
  async getPendingProperties(req, res) {
    try {
      const properties = await Property.find({ verificationStatus: 'pending' })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: properties.length,
        properties: properties.map(p => ({
          propertyId: p.propertyId,
          ownerAccountId: p.ownerAccountId,
          ipfsCid: p.ipfsCid,
          propertyType: p.propertyType,
          price: p.price,
          verificationStatus: p.verificationStatus,
          documents: p.documents,
          createdAt: p.createdAt
        }))
      });
    } catch (error) {
      console.error('Get pending properties error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending properties'
      });
    }
  }

  // Get properties by verification status
  async getPropertiesByStatus(req, res) {
    try {
      const { status } = req.params;

      const validStatuses = ['pending', 'verified', 'rejected', 'under_review'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          validStatuses
        });
      }

      const properties = await Property.find({ verificationStatus: status })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        status,
        count: properties.length,
        properties: properties.map(p => ({
          propertyId: p.propertyId,
          ownerAccountId: p.ownerAccountId,
          ipfsCid: p.ipfsCid,
          price: p.price,
          verificationStatus: p.verificationStatus,
          verifiedBy: p.verifiedBy,
          verifiedAt: p.verifiedAt,
          verificationNotes: p.verificationNotes,
          rejectionReason: p.rejectionReason,
          createdAt: p.createdAt
        }))
      });
    } catch (error) {
      console.error('Get properties by status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve properties'
      });
    }
  }

  // Get verification history for a property
  async getVerificationHistory(req, res) {
    try {
      const { propertyId } = req.params;

      const history = await VerificationHistory.find({ propertyId })
        .sort({ timestamp: -1 });

      res.json({
        success: true,
        propertyId,
        count: history.length,
        history: history.map(h => ({
          action: h.action,
          performedBy: h.performedBy,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          notes: h.notes,
          timestamp: h.timestamp
        }))
      });
    } catch (error) {
      console.error('Get verification history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification history'
      });
    }
  }

  // Approve property
  async approveProperty(req, res) {
    try {
      const { propertyId } = req.params;
      const { adminAccountId, notes } = req.body;

      if (!adminAccountId) {
        return res.status(400).json({
          success: false,
          error: 'Admin account ID required'
        });
      }

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      if (property.verificationStatus === 'verified') {
        return res.status(400).json({
          success: false,
          error: 'Property already verified'
        });
      }

      const previousStatus = property.verificationStatus;

      // Update property
      property.verificationStatus = 'verified';
      property.verifiedBy = adminAccountId;
      property.verifiedAt = new Date();
      property.verificationNotes = notes || null;
      await property.save();

      // Create history entry
      await VerificationHistory.create({
        propertyId,
        action: 'approved',
        performedBy: adminAccountId,
        previousStatus,
        newStatus: 'verified',
        notes
      });

      res.json({
        success: true,
        message: 'Property approved',
        property: {
          propertyId: property.propertyId,
          verificationStatus: property.verificationStatus,
          verifiedBy: property.verifiedBy,
          verifiedAt: property.verifiedAt,
          verificationNotes: property.verificationNotes
        }
      });
    } catch (error) {
      console.error('Approve property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve property'
      });
    }
  }

  // Reject property
  async rejectProperty(req, res) {
    try {
      const { propertyId } = req.params;
      const { adminAccountId, reason } = req.body;

      if (!adminAccountId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Admin account ID and rejection reason required'
        });
      }

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const previousStatus = property.verificationStatus;

      // Update property
      property.verificationStatus = 'rejected';
      property.verifiedBy = adminAccountId;
      property.verifiedAt = new Date();
      property.rejectionReason = reason;
      await property.save();

      // Create history entry
      await VerificationHistory.create({
        propertyId,
        action: 'rejected',
        performedBy: adminAccountId,
        previousStatus,
        newStatus: 'rejected',
        notes: reason
      });

      res.json({
        success: true,
        message: 'Property rejected',
        property: {
          propertyId: property.propertyId,
          verificationStatus: property.verificationStatus,
          verifiedBy: property.verifiedBy,
          rejectionReason: property.rejectionReason
        }
      });
    } catch (error) {
      console.error('Reject property error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject property'
      });
    }
  }

  // Mark property for review
  async markForReview(req, res) {
    try {
      const { propertyId } = req.params;
      const { adminAccountId, notes } = req.body;

      if (!adminAccountId) {
        return res.status(400).json({
          success: false,
          error: 'Admin account ID required'
        });
      }

      const property = await Property.findOne({ propertyId });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      const previousStatus = property.verificationStatus;

      // Update property
      property.verificationStatus = 'under_review';
      property.verificationNotes = notes || null;
      await property.save();

      // Create history entry
      await VerificationHistory.create({
        propertyId,
        action: 'under_review',
        performedBy: adminAccountId,
        previousStatus,
        newStatus: 'under_review',
        notes
      });

      res.json({
        success: true,
        message: 'Property marked for review',
        property: {
          propertyId: property.propertyId,
          verificationStatus: property.verificationStatus,
          verificationNotes: property.verificationNotes
        }
      });
    } catch (error) {
      console.error('Mark for review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark property for review'
      });
    }
  }

  // Get verification statistics
  async getVerificationStats(req, res) {
    try {
      const stats = await Property.aggregate([
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusCounts = {
        pending: 0,
        verified: 0,
        rejected: 0,
        under_review: 0
      };

      stats.forEach(stat => {
        statusCounts[stat._id] = stat.count;
      });

      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

      // Get recent activity
      const recentActivity = await VerificationHistory.find()
        .sort({ timestamp: -1 })
        .limit(10);

      res.json({
        success: true,
        stats: {
          total,
          by_status: statusCounts,
          recent_activity: recentActivity.map(h => ({
            propertyId: h.propertyId,
            action: h.action,
            performedBy: h.performedBy,
            newStatus: h.newStatus,
            timestamp: h.timestamp
          }))
        }
      });
    } catch (error) {
      console.error('Get verification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification statistics'
      });
    }
  }
}

module.exports = new VerificationController();