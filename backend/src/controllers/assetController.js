/**
 * Asset Controller - Property Management Logic
 * Handles all property-related operations with real Miden integration
 * UPDATED: Now includes MongoDB integration for verification system
 */

const midenClient = require('../services/midenClient');
const ipfsService = require('../services/ipfsService');
const noteManager = require('../services/noteManager');
const logger = require('../utils/logger');
const Property = require('../models/Property'); // ← ADD THIS

// In-memory storage (replace with database in production)
const assets = new Map();
const assetHistory = new Map();

/**
 * Mint new property as Miden note
 * UPDATED: Now saves to MongoDB for verification workflow
 */
exports.mintAsset = async (req, res, next) => {
  try {
    const { title, description, location, price, propertyType, ownerAddress } = req.body;
    const files = req.files || [];

    logger.info('Minting new property', { title, ownerAddress });

    // Validate input
    if (!title || !location || !price || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, location, price, ownerAddress'
      });
    }

    // Prepare property metadata
    const metadata = {
      title,
      description,
      location,
      price,
      propertyType: propertyType || 'residential',
      images: files.map(f => ({ name: f.originalname, size: f.size })),
      createdAt: new Date().toISOString()
    };

    // Encrypt and upload to IPFS
    const ipfsCid = await ipfsService.uploadEncrypted(metadata);
    logger.info('Metadata uploaded to IPFS', { ipfsCid });

    // Create property note on Miden
    const propertyData = {
      id: `property_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ipfsCid,
      type: propertyType || 'residential',
      price: parseInt(price)
    };

    const { noteId, commitment } = await noteManager.createPropertyNote(
      propertyData,
      ownerAddress
    );

    // Store in memory (existing)
    const asset = {
      id: propertyData.id,
      noteId,
      commitment,
      ipfsCid,
      owner: ownerAddress,
      title,
      location: location.city || location,
      price,
      propertyType: propertyType || 'residential',
      status: 'active',
      createdAt: new Date().toISOString(),
      publicData: { title, location: location.city || location, price }
    };

    assets.set(asset.id, asset);
    
    // Initialize history
    assetHistory.set(asset.id, [{
      action: 'minted',
      timestamp: new Date().toISOString(),
      by: ownerAddress,
      noteId
    }]);

    // ✅ NEW: Save to MongoDB for verification workflow
    try {
      await Property.create({
        propertyId: asset.id,
        ownerAccountId: ownerAddress,
        ipfsCid: ipfsCid,
        propertyType: propertyType === 'commercial' ? 2 : 1,
        price: parseInt(price),
        noteId: noteId,
        transactionId: commitment || noteId, // Use commitment as transaction ID
        verificationStatus: 'pending', // Start as pending
        documents: files.map(f => ({
          type: f.mimetype,
          url: `ipfs://${ipfsCid}/${f.originalname}`,
          uploadedAt: new Date()
        }))
      });
      logger.info('Property saved to MongoDB for verification', { propertyId: asset.id });
    } catch (dbError) {
      // Don't fail the mint if MongoDB save fails
      logger.error('Failed to save to MongoDB (non-critical)', { error: dbError.message });
    }

    logger.info('Property minted successfully', { assetId: asset.id, noteId });

    res.status(201).json({
      success: true,
      asset: {
        id: asset.id,
        noteId,
        commitment,
        ipfsCid,
        explorerUrl: `${process.env.MIDEN_EXPLORER_URL}/note/${noteId}`,
        publicData: asset.publicData
      },
      // Include verification status
      verification: {
        status: 'pending',
        message: 'Property submitted for verification'
      }
    });

  } catch (error) {
    logger.error('Error minting asset', { error: error.message });
    next(error);
  }
};

/**
 * List all properties
 * UPDATED: Now queries MongoDB for verified properties
 */
exports.listAssets = async (req, res, next) => {
  try {
    const { status, propertyType, minPrice, maxPrice, location, limit = 50, offset = 0, verified } = req.query;

    // If verified filter requested, query MongoDB
    if (verified === 'true') {
      const query = { verificationStatus: 'verified' };
      
      if (propertyType) query.propertyType = propertyType === 'commercial' ? 2 : 1;
      if (minPrice) query.price = { ...query.price, $gte: parseInt(minPrice) };
      if (maxPrice) query.price = { ...query.price, $lte: parseInt(maxPrice) };

      const properties = await Property.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      const total = await Property.countDocuments(query);

      return res.json({
        success: true,
        assets: properties.map(p => ({
          id: p.propertyId,
          noteId: p.noteId,
          title: p.propertyId,
          location: 'Location hidden',
          price: p.price,
          verified: true
        })),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      });
    }

    // Original in-memory query
    let assetList = Array.from(assets.values());

    // Apply filters
    if (status) assetList = assetList.filter(a => a.status === status);
    if (propertyType) assetList = assetList.filter(a => a.propertyType === propertyType);
    if (minPrice) assetList = assetList.filter(a => a.price >= parseInt(minPrice));
    if (maxPrice) assetList = assetList.filter(a => a.price <= parseInt(maxPrice));
    if (location) assetList = assetList.filter(a => a.location.toLowerCase().includes(location.toLowerCase()));

    // Pagination
    const total = assetList.length;
    const paginatedAssets = assetList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      assets: paginatedAssets.map(a => ({ ...a.publicData, id: a.id, noteId: a.noteId })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    logger.error('Error listing assets', { error: error.message });
    next(error);
  }
};

/**
 * Get property details
 * UPDATED: Now includes verification status from MongoDB
 */
exports.getAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = assets.get(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Check verification status in MongoDB
    let verificationData = null;
    try {
      const property = await Property.findOne({ propertyId: id });
      if (property) {
        verificationData = {
          status: property.verificationStatus,
          verifiedAt: property.verifiedAt,
          verifiedBy: property.verifiedBy
        };
      }
    } catch (dbError) {
      logger.error('Failed to fetch verification status', { error: dbError.message });
    }

    res.json({
      success: true,
      asset: {
        ...asset.publicData,
        id: asset.id,
        noteId: asset.noteId,
        status: asset.status,
        createdAt: asset.createdAt,
        explorerUrl: `${process.env.MIDEN_EXPLORER_URL}/note/${asset.noteId}`,
        verification: verificationData
      }
    });

  } catch (error) {
    logger.error('Error getting asset', { error: error.message });
    next(error);
  }
};

// Keep all other existing methods unchanged...
exports.unlockAssetDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proofs } = req.body;

    const asset = assets.get(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Verify proofs
    const proofService = require('../services/proofService');
    const verified = await proofService.verifyProofs(proofs);

    if (!verified) {
      return res.status(403).json({
        success: false,
        error: 'Invalid proofs - cannot unlock details'
      });
    }

    // Decrypt metadata from IPFS
    const metadata = await ipfsService.downloadDecrypted(asset.ipfsCid);

    res.json({
      success: true,
      asset: {
        ...asset,
        metadata,
        unlocked: true
      }
    });

  } catch (error) {
    logger.error('Error unlocking asset', { error: error.message });
    next(error);
  }
};

exports.getOwnerAssets = async (req, res, next) => {
  try {
    const { address } = req.params;
    const ownerAssets = Array.from(assets.values()).filter(a => a.owner === address);

    res.json({
      success: true,
      assets: ownerAssets,
      count: ownerAssets.length
    });

  } catch (error) {
    logger.error('Error getting owner assets', { error: error.message });
    next(error);
  }
};

exports.getAssetHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = assetHistory.get(id) || [];

    res.json({
      success: true,
      history
    });

  } catch (error) {
    logger.error('Error getting asset history', { error: error.message });
    next(error);
  }
};

exports.updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const asset = assets.get(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Update allowed fields
    if (updates.title) asset.title = updates.title;
    if (updates.description) asset.description = updates.description;
    if (updates.price) asset.price = updates.price;

    assets.set(id, asset);

    // Add to history
    const history = assetHistory.get(id) || [];
    history.push({
      action: 'updated',
      timestamp: new Date().toISOString(),
      updates
    });
    assetHistory.set(id, history);

    res.json({
      success: true,
      asset
    });

  } catch (error) {
    logger.error('Error updating asset', { error: error.message });
    next(error);
  }
};

exports.deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!assets.has(id)) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    assets.delete(id);
    assetHistory.delete(id);

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting asset', { error: error.message });
    next(error);
  }
};

exports.getAssetOffers = async (req, res, next) => {
  try {
    const { id } = req.params;
    // This would query offers for this asset
    // Placeholder for now
    res.json({
      success: true,
      offers: []
    });

  } catch (error) {
    next(error);
  }
};

exports.getMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = assets.get(id);

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.json({
      success: true,
      ipfsCid: asset.ipfsCid
    });

  } catch (error) {
    next(error);
  }
};

exports.transferAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { toAddress } = req.body;

    const asset = assets.get(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Update owner
    asset.owner = toAddress;
    assets.set(id, asset);

    // Add to history
    const history = assetHistory.get(id) || [];
    history.push({
      action: 'transferred',
      timestamp: new Date().toISOString(),
      from: asset.owner,
      to: toAddress
    });
    assetHistory.set(id, history);

    res.json({
      success: true,
      asset
    });

  } catch (error) {
    next(error);
  }
};

exports.searchAssets = async (req, res, next) => {
  try {
    const { q } = req.query;
    const assetList = Array.from(assets.values());

    const results = assetList.filter(a =>
      a.title.toLowerCase().includes(q.toLowerCase()) ||
      a.location.toLowerCase().includes(q.toLowerCase())
    );

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    next(error);
  }
};

exports.getFeaturedAssets = async (req, res, next) => {
  try {
    const assetList = Array.from(assets.values()).slice(0, 10);

    res.json({
      success: true,
      assets: assetList
    });

  } catch (error) {
    next(error);
  }
};

exports.getAssetStats = async (req, res, next) => {
  try {
    const assetList = Array.from(assets.values());

    res.json({
      success: true,
      stats: {
        total: assetList.length,
        active: assetList.filter(a => a.status === 'active').length,
        sold: assetList.filter(a => a.status === 'sold').length,
        avgPrice: assetList.reduce((sum, a) => sum + a.price, 0) / assetList.length || 0
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.batchMintAssets = async (req, res, next) => {
  try {
    const { properties } = req.body;
    const results = [];

    for (const property of properties) {
      req.body = property;
      await exports.mintAsset(req, { json: (data) => results.push(data) }, next);
    }

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    next(error);
  }
};