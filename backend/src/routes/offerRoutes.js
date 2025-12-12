// File: backend/src/routes/offerRoutes.js
// API routes for offer management WITH PROOF ENFORCEMENT

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

// Check if buyer can make offer (pre-check compliance)
router.get('/check-eligibility', offerController.checkBuyerEligibility);

// Create new offer (with proof enforcement)
router.post('/create', offerController.createOffer);

// Get offers for a property
router.get('/property/:propertyId', offerController.getPropertyOffers);

// Get offers made by buyer
router.get('/buyer/:buyerId', offerController.getBuyerOffers);

// Get offers received by seller
router.get('/seller/:sellerId', offerController.getSellerOffers);

// Accept offer (with proof re-verification)
router.post('/:offerId/accept', offerController.acceptOffer);

// Reject offer
router.post('/:offerId/reject', offerController.rejectOffer);

// Get single offer by ID
router.get('/:offerId', offerController.getOfferById);

module.exports = router;