// File: backend/src/controllers/escrowController.js
// Controller for escrow operations

const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');

class EscrowController {
  /**
   * Fund escrow (buyer sends funds)
   * POST /api/v1/escrow/fund
   */
  async fundEscrow(req, res) {
    try {
      const { escrow_account_id, buyer_account_id, seller_account_id, amount } = req.body;
      
      // Validate required fields
      if (!escrow_account_id || !buyer_account_id || !seller_account_id || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: escrow_account_id, buyer_account_id, seller_account_id, amount'
        });
      }
      
      logger.info('Funding escrow', { escrow_account_id, buyer_account_id, amount });
      
      // Create escrow object in format midenClient expects
      const escrow = {
        escrowAccountId: escrow_account_id,
        buyerAccountId: buyer_account_id,
        sellerAccountId: seller_account_id,
        amount: parseInt(amount)
      };
      
      const result = await midenClient.fundEscrow(escrow);
      
      res.json({
        success: true,
        transaction_id: result.transactionId,
        explorer_url: result.explorerUrl,
        message: 'Escrow funded successfully'
      });
    } catch (error) {
      logger.error('Fund escrow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fund escrow',
        details: error.message
      });
    }
  }

  /**
   * Release escrow to seller
   * POST /api/v1/escrow/release
   */
  async releaseEscrow(req, res) {
    try {
      const { escrow_account_id, buyer_account_id, seller_account_id, amount } = req.body;
      
      // Validate required fields
      if (!escrow_account_id || !buyer_account_id || !seller_account_id || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: escrow_account_id, buyer_account_id, seller_account_id, amount'
        });
      }
      
      logger.info('Releasing escrow', { escrow_account_id, seller_account_id, amount });
      
      // Create escrow object
      const escrow = {
        escrowAccountId: escrow_account_id,
        buyerAccountId: buyer_account_id,
        sellerAccountId: seller_account_id,
        amount: parseInt(amount)
      };
      
      const result = await midenClient.releaseEscrow(escrow);
      
      res.json({
        success: true,
        transaction_id: result.transactionId,
        explorer_url: result.explorerUrl,
        message: 'Escrow released to seller successfully'
      });
    } catch (error) {
      logger.error('Release escrow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to release escrow',
        details: error.message
      });
    }
  }

  /**
   * Refund escrow to buyer
   * POST /api/v1/escrow/refund
   */
  async refundEscrow(req, res) {
    try {
      const { escrow_account_id, buyer_account_id, seller_account_id, amount } = req.body;
      
      // Validate required fields
      if (!escrow_account_id || !buyer_account_id || !seller_account_id || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: escrow_account_id, buyer_account_id, seller_account_id, amount'
        });
      }
      
      logger.info('Refunding escrow', { escrow_account_id, buyer_account_id, amount });
      
      // Create escrow object
      const escrow = {
        escrowAccountId: escrow_account_id,
        buyerAccountId: buyer_account_id,
        sellerAccountId: seller_account_id,
        amount: parseInt(amount)
      };
      
      const result = await midenClient.refundEscrow(escrow);
      
      res.json({
        success: true,
        transaction_id: result.transactionId,
        explorer_url: result.explorerUrl,
        message: 'Escrow refunded to buyer successfully'
      });
    } catch (error) {
      logger.error('Refund escrow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refund escrow',
        details: error.message
      });
    }
  }

  /**
   * Get escrow status
   * GET /api/v1/escrow/status/:escrowId
   */
  async getEscrowStatus(req, res) {
    try {
      const { escrowId } = req.params;
      
      logger.info('Getting escrow status', { escrowId });
      
      // This would query escrow status from blockchain
      res.json({
        success: true,
        escrowId,
        message: 'Escrow status endpoint - check blockchain explorer',
        explorerUrl: `https://testnet.midenscan.com/account/${escrowId}`
      });
    } catch (error) {
      logger.error('Get escrow status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get escrow status'
      });
    }
  }
}

module.exports = new EscrowController();