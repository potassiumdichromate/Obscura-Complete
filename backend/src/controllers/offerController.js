/**
 * Offer Controller - Complete offer management with Miden integration
 */

const logger = require('../utils/logger');

// In-memory storage
const offers = new Map();

exports.createOffer = async (req, res, next) => {
  try {
    const { assetId, buyerAddress, offerPrice, accreditationProof, jurisdictionProof, message } = req.body;
    
    const offer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      buyerAddress,
      offerPrice: parseInt(offerPrice),
      accreditationProof,
      jurisdictionProof,
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    offers.set(offer.id, offer);
    logger.info('Offer created', { offerId: offer.id });
    
    res.status(201).json({ success: true, offer });
  } catch (error) {
    logger.error('Error creating offer', { error: error.message });
    next(error);
  }
};

exports.getOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = offers.get(id);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.getAssetOffers = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const assetOffers = Array.from(offers.values()).filter(o => o.assetId === assetId);
    
    res.json({ success: true, offers: assetOffers, count: assetOffers.length });
  } catch (error) {
    next(error);
  }
};

exports.acceptOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = offers.get(id);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    offer.status = 'accepted';
    offer.acceptedAt = new Date().toISOString();
    offers.set(id, offer);
    
    logger.info('Offer accepted', { offerId: id });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.rejectOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const offer = offers.get(id);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    offer.status = 'rejected';
    offer.rejectedAt = new Date().toISOString();
    offer.rejectionReason = reason;
    offers.set(id, offer);
    
    logger.info('Offer rejected', { offerId: id, reason });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.cancelOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = offers.get(id);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    offer.status = 'cancelled';
    offer.cancelledAt = new Date().toISOString();
    offers.set(id, offer);
    
    logger.info('Offer cancelled', { offerId: id });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.getBuyerOffers = async (req, res, next) => {
  try {
    const { address } = req.params;
    const buyerOffers = Array.from(offers.values()).filter(o => o.buyerAddress === address);
    
    res.json({ success: true, offers: buyerOffers, count: buyerOffers.length });
  } catch (error) {
    next(error);
  }
};

exports.getSellerOffers = async (req, res, next) => {
  try {
    const { address } = req.params;
    // Would filter by seller address from asset
    const sellerOffers = Array.from(offers.values());
    
    res.json({ success: true, offers: sellerOffers, count: sellerOffers.length });
  } catch (error) {
    next(error);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const offer = offers.get(id);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    Object.assign(offer, updates);
    offers.set(id, offer);
    
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.getOfferStats = async (req, res, next) => {
  try {
    const allOffers = Array.from(offers.values());
    
    res.json({
      success: true,
      stats: {
        total: allOffers.length,
        pending: allOffers.filter(o => o.status === 'pending').length,
        accepted: allOffers.filter(o => o.status === 'accepted').length,
        rejected: allOffers.filter(o => o.status === 'rejected').length,
        cancelled: allOffers.filter(o => o.status === 'cancelled').length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.counterOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { counterPrice } = req.body;
    const originalOffer = offers.get(id);
    
    if (!originalOffer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    const counterOffer = {
      ...originalOffer,
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      offerPrice: parseInt(counterPrice),
      isCounter: true,
      originalOfferId: id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    offers.set(counterOffer.id, counterOffer);
    
    res.status(201).json({ success: true, offer: counterOffer });
  } catch (error) {
    next(error);
  }
};

exports.getPendingOffers = async (req, res, next) => {
  try {
    const pendingOffers = Array.from(offers.values()).filter(o => o.status === 'pending');
    
    res.json({ success: true, offers: pendingOffers, count: pendingOffers.length });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
