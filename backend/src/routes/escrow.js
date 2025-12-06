const express = require('express');
const router = express.Router();
const midenClient = require('../services/midenClient');

// POST /api/v1/escrow/create
router.post('/create', async (req, res) => {
  try {
    const { buyerAccountId, sellerAccountId, amount } = req.body;
    const escrow = await midenClient.createEscrow(buyerAccountId, sellerAccountId, amount);
    res.json({ success: true, escrow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/escrow/fund
router.post('/fund', async (req, res) => {
  try {
    const escrow = req.body;
    const result = await midenClient.fundEscrow(escrow);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/escrow/release
router.post('/release', async (req, res) => {
  try {
    const escrow = req.body;
    const result = await midenClient.releaseEscrow(escrow);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/escrow/refund
router.post('/refund', async (req, res) => {
  try {
    const escrow = req.body;
    const result = await midenClient.refundEscrow(escrow);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;