// File: backend/src/routes/propertyRoutes.js
// API routes for property management

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

// Mint new property NFT
router.post('/mint', propertyController.mintProperty);

// List property for sale
router.post('/list', propertyController.listProperty);

// Get available properties (marketplace)
router.get('/available', propertyController.getAvailableProperties);

// Get property details with selective disclosure
router.get('/:propertyId/details', propertyController.getPropertyDetails);

// Get my properties
router.get('/my-properties', propertyController.getMyProperties);

// Delist property
router.post('/:propertyId/delist', propertyController.delistProperty);

// Get single property by ID
router.get('/:propertyId', propertyController.getPropertyById);

module.exports = router;