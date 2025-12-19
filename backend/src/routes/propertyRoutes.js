// File: backend/src/routes/propertyRoutes.js
// UPDATED: Added consume status endpoints

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

// ============================================================================
// PROPERTY MANAGEMENT
// ============================================================================

// Mint new property (with background consume)
router.post('/mint', propertyController.mintProperty);

// List property for sale
router.post('/list', propertyController.listProperty);

// Delist property
router.post('/:propertyId/delist', propertyController.delistProperty);


// NEW: Encrypted minting
router.post('/mint-encrypted', propertyController.mintEncryptedProperty);

// NEW: Request access after proof verification
// router.post('/:propertyId/request-access', propertyController.requestPropertyAccess);


// ============================================================================
// CONSUME STATUS ENDPOINTS (NEW!)
// ============================================================================

// Check consume status for a property
router.get('/:propertyId/consume-status', propertyController.getConsumeStatus);

// Get all pending consumes (admin/monitoring)
router.get('/consume/pending', propertyController.getPendingConsumes);

// Manually retry failed consume
router.post('/:propertyId/consume/retry', propertyController.retryConsume);

// Manual consume (optional - for testing/admin)
router.post('/consume-note/:propertyId', propertyController.consumePropertyNote);

// ============================================================================
// PROPERTY QUERIES
// ============================================================================

// Get available properties (marketplace)
router.get('/available', propertyController.getAvailableProperties);

// Get property details with selective disclosure
router.get('/:propertyId/details', propertyController.getPropertyDetails);

// Get properties owned by user
router.get('/my-properties', propertyController.getMyProperties);

// Get single property by ID
router.get('/:propertyId', propertyController.getPropertyById);

module.exports = router;