/**
 * Health Routes - System Health Checks
 * 3 endpoints for monitoring system health
 */

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @route   GET /api/v1/health
 * @desc    Overall system health check
 * @access  Public
 */
router.get('/', healthController.healthCheck);

/**
 * @route   GET /api/v1/health/miden
 * @desc    Miden client status
 * @access  Public
 */
router.get('/miden', healthController.midenStatus);

/**
 * @route   GET /api/v1/health/ipfs
 * @desc    IPFS connection status
 * @access  Public
 */
router.get('/ipfs', healthController.ipfsStatus);

module.exports = router;
