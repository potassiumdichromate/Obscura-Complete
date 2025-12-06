/**
 * Offer Routes - Offer Management
 * 12 endpoints for complete offer lifecycle
 */

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

/**
 * @route   POST /api/v1/offers
 * @desc    Create new offer with proofs
 * @access  Public
 */
router.post('/', offerController.createOffer);

/**
 * @route   GET /api/v1/offers/:id
 * @desc    Get offer details
 * @access  Public
 */
router.get('/:id', offerController.getOffer);

/**
 * @route   GET /api/v1/offers/asset/:assetId
 * @desc    Get all offers for an asset
 * @access  Public
 */
router.get('/asset/:assetId', offerController.getAssetOffers);

/**
 * @route   PUT /api/v1/offers/:id/accept
 * @desc    Accept an offer (seller)
 * @access  Seller only
 */
router.put('/:id/accept', offerController.acceptOffer);

/**
 * @route   PUT /api/v1/offers/:id/reject
 * @desc    Reject an offer (seller)
 * @access  Seller only
 */
router.put('/:id/reject', offerController.rejectOffer);

/**
 * @route   PUT /api/v1/offers/:id/cancel
 * @desc    Cancel an offer (buyer)
 * @access  Buyer only
 */
router.put('/:id/cancel', offerController.cancelOffer);

/**
 * @route   GET /api/v1/offers/buyer/:address
 * @desc    Get all offers made by buyer
 * @access  Public
 */
router.get('/buyer/:address', offerController.getBuyerOffers);

/**
 * @route   GET /api/v1/offers/seller/:address
 * @desc    Get all offers received by seller
 * @access  Public
 */
router.get('/seller/:address', offerController.getSellerOffers);

/**
 * @route   PUT /api/v1/offers/:id/update
 * @desc    Update offer details
 * @access  Buyer only
 */
router.put('/:id/update', offerController.updateOffer);

/**
 * @route   GET /api/v1/offers/stats
 * @desc    Get offer statistics
 * @access  Public
 */
router.get('/stats', offerController.getOfferStats);

/**
 * @route   POST /api/v1/offers/:id/counter
 * @desc    Make counter offer
 * @access  Seller only
 */
router.post('/:id/counter', offerController.counterOffer);

/**
 * @route   GET /api/v1/offers/pending
 * @desc    Get all pending offers
 * @access  Public
 */
router.get('/pending', offerController.getPendingOffers);

module.exports = router;
