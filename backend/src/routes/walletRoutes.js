/**
 * Wallet Routes - Miden Wallet Management
 * 5 endpoints for wallet operations (added funding)
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

/**
 * @route   POST /api/v1/wallet/create
 * @desc    Create new Miden account
 * @access  Public
 */
router.post('/create', walletController.createWallet);

/**
 * @route   GET /api/v1/wallet/:address
 * @desc    Get wallet details
 * @access  Public
 */
router.get('/:address', walletController.getWallet);

/**
 * @route   GET /api/v1/wallet/:address/balance
 * @desc    Get wallet balance
 * @access  Public
 */
router.get('/:address/balance', walletController.getBalance);

/**
 * @route   POST /api/v1/wallet/sync
 * @desc    Sync wallet with Miden testnet
 * @access  Public
 */
router.post('/sync', walletController.syncWallet);

/**
 * @route   POST /api/v1/wallet/fund
 * @desc    Fund wallet with test tokens from faucet (NEW!)
 * @access  Public
 * @body    { accountId: string, amount: number }
 */
router.post('/fund', walletController.fundWallet);

module.exports = router;