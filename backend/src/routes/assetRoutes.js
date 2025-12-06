/**
 * Asset Routes - Property Management
 * 15 endpoints for complete property lifecycle
 */

const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files allowed'), false);
    }
  }
});

/**
 * @route   POST /api/v1/assets/mint
 * @desc    Mint new property as Miden note
 * @access  Public
 */
router.post('/mint', upload.array('files', 10), assetController.mintAsset);

/**
 * @route   GET /api/v1/assets
 * @desc    List all properties with filters
 * @access  Public
 */
router.get('/', assetController.listAssets);

/**
 * @route   GET /api/v1/assets/:id
 * @desc    Get property details (selective disclosure)
 * @access  Public
 */
router.get('/:id', assetController.getAsset);

/**
 * @route   POST /api/v1/assets/:id/unlock
 * @desc    Unlock full details with valid proofs
 * @access  Public
 */
router.post('/:id/unlock', assetController.unlockAssetDetails);

/**
 * @route   GET /api/v1/assets/owner/:address
 * @desc    Get all properties owned by address
 * @access  Public
 */
router.get('/owner/:address', assetController.getOwnerAssets);

/**
 * @route   GET /api/v1/assets/:id/history
 * @desc    Get property transaction history
 * @access  Public
 */
router.get('/:id/history', assetController.getAssetHistory);

/**
 * @route   PUT /api/v1/assets/:id/update
 * @desc    Update property metadata
 * @access  Owner only
 */
router.put('/:id/update', assetController.updateAsset);

/**
 * @route   DELETE /api/v1/assets/:id
 * @desc    Delete/burn property note
 * @access  Owner only
 */
router.delete('/:id', assetController.deleteAsset);

/**
 * @route   GET /api/v1/assets/:id/offers
 * @desc    Get all offers for a property
 * @access  Public
 */
router.get('/:id/offers', assetController.getAssetOffers);

/**
 * @route   GET /api/v1/assets/:id/metadata
 * @desc    Get encrypted metadata CID
 * @access  Public
 */
router.get('/:id/metadata', assetController.getMetadata);

/**
 * @route   POST /api/v1/assets/:id/transfer
 * @desc    Transfer property ownership
 * @access  Owner only
 */
router.post('/:id/transfer', assetController.transferAsset);

/**
 * @route   GET /api/v1/assets/search
 * @desc    Search properties by criteria
 * @access  Public
 */
router.get('/search', assetController.searchAssets);

/**
 * @route   GET /api/v1/assets/featured
 * @desc    Get featured properties
 * @access  Public
 */
router.get('/featured', assetController.getFeaturedAssets);

/**
 * @route   GET /api/v1/assets/stats
 * @desc    Get asset statistics
 * @access  Public
 */
router.get('/stats', assetController.getAssetStats);

/**
 * @route   POST /api/v1/assets/batch-mint
 * @desc    Mint multiple properties at once
 * @access  Public
 */
router.post('/batch-mint', assetController.batchMintAssets);

module.exports = router;
