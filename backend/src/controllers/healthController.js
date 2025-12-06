const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');

exports.healthCheck = async (req, res, next) => {
  try {
    res.json({
      success: true,
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'operational',
        miden: 'configured',
        ipfs: 'configured'
      }
    });
  } catch (error) { next(error); }
};

exports.midenStatus = async (req, res, next) => {
  try {
    const status = await midenClient.healthCheck();
    res.json({ success: true, miden: status });
  } catch (error) { next(error); }
};

exports.ipfsStatus = async (req, res, next) => {
  try {
    res.json({ success: true, ipfs: { status: 'configured', host: process.env.IPFS_HOST } });
  } catch (error) { next(error); }
};

module.exports = exports;
