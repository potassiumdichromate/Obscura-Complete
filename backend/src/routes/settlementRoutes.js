// File: backend/src/routes/settlementRoutes.js
// API routes for settlement management

const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');

// Check if settlement is ready
router.get('/:offerId/check-ready', settlementController.checkSettlementReady);

// Execute atomic settlement
router.post('/:offerId/execute', settlementController.executeSettlement);

// Get settlement history
router.get('/history', settlementController.getSettlementHistory);

// Get settlement details by offer ID
router.get('/:offerId', settlementController.getSettlementDetails);

module.exports = router;