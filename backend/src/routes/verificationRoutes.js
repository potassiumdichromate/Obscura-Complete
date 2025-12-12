// File: backend/src/routes/verificationRoutes.js
// Property verification routes - MongoDB version

const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

// ============================================================================
// VERIFICATION ROUTES
// ============================================================================

// Get all pending properties (admin)
router.get('/pending', verificationController.getPendingProperties);

// Get properties by verification status
router.get('/status/:status', verificationController.getPropertiesByStatus);

// Get verification history for a property
router.get('/history/:propertyId', verificationController.getVerificationHistory);

// Approve property
router.post('/approve/:propertyId', verificationController.approveProperty);

// Reject property
router.post('/reject/:propertyId', verificationController.rejectProperty);

// Mark property for review
router.post('/review/:propertyId', verificationController.markForReview);

// Get verification stats (admin dashboard)
router.get('/stats', verificationController.getVerificationStats);

module.exports = router;