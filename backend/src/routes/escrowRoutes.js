/**
 * Escrow Routes - Escrow Management  
 * 13 endpoints for complete escrow lifecycle
 */

const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');

/**
 * @route   POST /api/v1/escrow/create
 * @desc    Create escrow account on Miden
 * @access  Public
 */
router.post('/create', escrowController.createEscrow);

/**
 * @route   POST /api/v1/escrow/:id/lock-funds
 * @desc    Lock buyer funds in escrow
 * @access  Buyer only
 */
router.post('/:id/lock-funds', escrowController.lockFunds);

/**
 * @route   POST /api/v1/escrow/:id/verify-compliance
 * @desc    Verify all compliance proofs
 * @access  Public
 */
router.post('/:id/verify-compliance', escrowController.verifyCompliance);

/**
 * @route   POST /api/v1/escrow/:id/execute
 * @desc    Execute settlement (atomic transfer)
 * @access  Public
 */
router.post('/:id/execute', escrowController.executeSettlement);

/**
 * @route   GET /api/v1/escrow/:id
 * @desc    Get escrow details
 * @access  Public
 */
router.get('/:id', escrowController.getEscrow);

/**
 * @route   GET /api/v1/escrow/offer/:offerId
 * @desc    Get escrow by offer ID
 * @access  Public
 */
router.get('/offer/:offerId', escrowController.getEscrowByOffer);

/**
 * @route   POST /api/v1/escrow/:id/refund
 * @desc    Refund escrow to buyer
 * @access  Public
 */
router.post('/:id/refund', escrowController.refundEscrow);

/**
 * @route   GET /api/v1/escrow/buyer/:address
 * @desc    Get all escrows for buyer
 * @access  Public
 */
router.get('/buyer/:address', escrowController.getBuyerEscrows);

/**
 * @route   GET /api/v1/escrow/seller/:address
 * @desc    Get all escrows for seller
 * @access  Public
 */
router.get('/seller/:address', escrowController.getSellerEscrows);

/**
 * @route   GET /api/v1/escrow/stats
 * @desc    Get escrow statistics
 * @access  Public
 */
router.get('/stats', escrowController.getEscrowStats);

/**
 * @route   PUT /api/v1/escrow/:id/update-deadline
 * @desc    Update escrow deadline
 * @access  Seller/Buyer
 */
router.put('/:id/update-deadline', escrowController.updateDeadline);

/**
 * @route   GET /api/v1/escrow/pending
 * @desc    Get all pending escrows
 * @access  Public
 */
router.get('/pending', escrowController.getPendingEscrows);

/**
 * @route   GET /api/v1/escrow/completed
 * @desc    Get all completed escrows
 * @access  Public
 */
router.get('/completed', escrowController.getCompletedEscrows);

module.exports = router;
