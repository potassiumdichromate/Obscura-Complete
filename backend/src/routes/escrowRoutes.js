// File: backend/src/routes/escrowRoutes.js
// Routes for escrow operations

const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');

/**
 * @route   POST /api/v1/escrow/fund
 * @desc    Fund escrow (buyer sends funds to escrow)
 * @access  Public
 * @body    { escrow_account_id, buyer_account_id, seller_account_id, amount }
 */
router.post('/fund', escrowController.fundEscrow);

/**
 * @route   POST /api/v1/escrow/release
 * @desc    Release escrow to seller (on successful sale)
 * @access  Public
 * @body    { escrow_account_id, buyer_account_id, seller_account_id, amount }
 */
router.post('/release', escrowController.releaseEscrow);

/**
 * @route   POST /api/v1/escrow/refund
 * @desc    Refund escrow to buyer (on failed sale)
 * @access  Public
 * @body    { escrow_account_id, buyer_account_id, seller_account_id, amount }
 */
router.post('/refund', escrowController.refundEscrow);

/**
 * @route   GET /api/v1/escrow/status/:escrowId
 * @desc    Get escrow status
 * @access  Public
 */
router.get('/status/:escrowId', escrowController.getEscrowStatus);

module.exports = router;