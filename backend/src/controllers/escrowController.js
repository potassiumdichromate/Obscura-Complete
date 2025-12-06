const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');
const escrows = new Map();

exports.createEscrow = async (req, res, next) => {
  try {
    const { sellerAccountId, buyerAccountId, propertyNoteId, amount, deadline } = req.body;
    const { escrowAccountId } = await midenClient.createEscrow(sellerAccountId, buyerAccountId, propertyNoteId, amount, deadline);
    const escrow = { id: escrowAccountId, sellerAccountId, buyerAccountId, propertyNoteId, amount, deadline, status: 'pending', createdAt: new Date().toISOString() };
    escrows.set(escrowAccountId, escrow);
    res.status(201).json({ success: true, escrow, explorerUrl: `${process.env.MIDEN_EXPLORER_URL}/account/${escrowAccountId}` });
  } catch (error) { logger.error('Error creating escrow', { error: error.message }); next(error); }
};

exports.lockFunds = async (req, res, next) => {
  try {
    const { id } = req.params;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    escrow.status = 'locked';
    escrow.lockedAt = new Date().toISOString();
    escrows.set(id, escrow);
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.verifyCompliance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proofs } = req.body;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    escrow.proofsVerified = true;
    escrow.verifiedAt = new Date().toISOString();
    escrows.set(id, escrow);
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.executeSettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    const result = await midenClient.executeEscrowSettlement(id, escrow.propertyNoteId);
    escrow.status = 'executed';
    escrow.executedAt = new Date().toISOString();
    escrows.set(id, escrow);
    res.json({ success: true, escrow, txId: result.txId, explorerUrl: result.explorerUrl });
  } catch (error) { next(error); }
};

exports.getEscrow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.getEscrowByOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const escrow = Array.from(escrows.values()).find(e => e.offerId === offerId);
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.refundEscrow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    escrow.status = 'refunded';
    escrow.refundedAt = new Date().toISOString();
    escrow.refundReason = reason;
    escrows.set(id, escrow);
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.getBuyerEscrows = async (req, res, next) => {
  try {
    const { address } = req.params;
    const buyerEscrows = Array.from(escrows.values()).filter(e => e.buyerAccountId === address);
    res.json({ success: true, escrows: buyerEscrows, count: buyerEscrows.length });
  } catch (error) { next(error); }
};

exports.getSellerEscrows = async (req, res, next) => {
  try {
    const { address } = req.params;
    const sellerEscrows = Array.from(escrows.values()).filter(e => e.sellerAccountId === address);
    res.json({ success: true, escrows: sellerEscrows, count: sellerEscrows.length });
  } catch (error) { next(error); }
};

exports.getEscrowStats = async (req, res, next) => {
  try {
    const allEscrows = Array.from(escrows.values());
    res.json({ success: true, stats: { total: allEscrows.length, pending: allEscrows.filter(e => e.status === 'pending').length, locked: allEscrows.filter(e => e.status === 'locked').length, executed: allEscrows.filter(e => e.status === 'executed').length, refunded: allEscrows.filter(e => e.status === 'refunded').length } });
  } catch (error) { next(error); }
};

exports.updateDeadline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deadline } = req.body;
    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    escrow.deadline = deadline;
    escrows.set(id, escrow);
    res.json({ success: true, escrow });
  } catch (error) { next(error); }
};

exports.getPendingEscrows = async (req, res, next) => {
  try {
    const pending = Array.from(escrows.values()).filter(e => e.status === 'pending');
    res.json({ success: true, escrows: pending, count: pending.length });
  } catch (error) { next(error); }
};

exports.getCompletedEscrows = async (req, res, next) => {
  try {
    const completed = Array.from(escrows.values()).filter(e => e.status === 'executed');
    res.json({ success: true, escrows: completed, count: completed.length });
  } catch (error) { next(error); }
};

module.exports = exports;
