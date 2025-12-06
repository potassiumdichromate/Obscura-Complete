/**
 * Obscura × Miden Complete Backend Server
 * 
 * Full production server with real Miden integration
 * 55+ endpoints | Real blockchain | Complete E2E flows
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Routes
const assetRoutes = require('./routes/assetRoutes');
const offerRoutes = require('./routes/offerRoutes');
// const escrowRoutes = require('./routes/escrowRoutes');
const proofRoutes = require('./routes/proofRoutes');
const walletRoutes = require('./routes/walletRoutes');
const healthRoutes = require('./routes/healthRoutes');
const escrowRoutes = require('./routes/escrow');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

const API_PREFIX = '/api/v1';

// Health & Status
app.use(`${API_PREFIX}/health`, healthRoutes);

// Assets (Properties)
app.use(`${API_PREFIX}/assets`, assetRoutes);

// Offers
app.use(`${API_PREFIX}/offers`, offerRoutes);

// Escrow
// app.use(`${API_PREFIX}/escrow`, escrowRoutes);
app.use('/api/v1/escrow', escrowRoutes);

// Proofs
app.use(`${API_PREFIX}/proofs`, proofRoutes);

// Wallet
app.use(`${API_PREFIX}/wallet`, walletRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Obscura × Miden API',
    version: '1.0.0',
    description: 'Privacy-preserving real estate marketplace on Miden blockchain',
    status: 'operational',
    blockchain: 'Miden Testnet',
    explorer: 'https://testnet.midenscan.com',
    endpoints: {
      health: `${API_PREFIX}/health`,
      assets: `${API_PREFIX}/assets`,
      offers: `${API_PREFIX}/offers`,
      escrow: `${API_PREFIX}/escrow`,
      proofs: `${API_PREFIX}/proofs`,
      wallet: `${API_PREFIX}/wallet`
    },
    documentation: '/docs'
  });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'Obscura × Miden API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}${API_PREFIX}`,
    
    endpoints: {
      assets: [
        'POST /assets/mint - Mint new property',
        'GET /assets - List all properties',
        'GET /assets/:id - Get property details',
        'POST /assets/:id/unlock - Unlock with proofs',
        'GET /assets/owner/:address - Get owner properties',
        'GET /assets/:id/history - Get property history',
        'PUT /assets/:id/update - Update property',
        'DELETE /assets/:id - Delete property',
        'GET /assets/:id/offers - Get property offers',
        'GET /assets/:id/metadata - Get metadata',
        'POST /assets/:id/transfer - Transfer property',
        'GET /assets/search - Search properties',
        'GET /assets/featured - Get featured properties',
        'GET /assets/stats - Get asset statistics',
        'POST /assets/batch-mint - Batch mint properties'
      ],
      
      offers: [
        'POST /offers - Create new offer',
        'GET /offers/:id - Get offer details',
        'GET /offers/asset/:assetId - Get offers for asset',
        'PUT /offers/:id/accept - Accept offer',
        'PUT /offers/:id/reject - Reject offer',
        'PUT /offers/:id/cancel - Cancel offer',
        'GET /offers/buyer/:address - Get buyer offers',
        'GET /offers/seller/:address - Get seller offers',
        'PUT /offers/:id/update - Update offer',
        'GET /offers/stats - Get offer statistics',
        'POST /offers/:id/counter - Counter offer',
        'GET /offers/pending - Get pending offers'
      ],
      
      escrow: [
        'POST /escrow/create - Create escrow',
        'POST /escrow/:id/lock-funds - Lock buyer funds',
        'POST /escrow/:id/verify-compliance - Verify proofs',
        'POST /escrow/:id/execute - Execute settlement',
        'GET /escrow/:id - Get escrow details',
        'GET /escrow/offer/:offerId - Get escrow by offer',
        'POST /escrow/:id/refund - Refund escrow',
        'GET /escrow/buyer/:address - Get buyer escrows',
        'GET /escrow/seller/:address - Get seller escrows',
        'GET /escrow/stats - Get escrow statistics',
        'PUT /escrow/:id/update-deadline - Update deadline',
        'GET /escrow/pending - Get pending escrows',
        'GET /escrow/completed - Get completed escrows'
      ],
      
      proofs: [
        'POST /proofs/ownership - Generate ownership proof',
        'POST /proofs/accreditation - Generate accreditation proof',
        'POST /proofs/jurisdiction - Generate jurisdiction proof',
        'POST /proofs/verify - Verify single proof',
        'POST /proofs/batch-verify - Verify multiple proofs',
        'GET /proofs/:id - Get proof details',
        'GET /proofs/user/:userId - Get user proofs',
        'DELETE /proofs/:id - Delete proof'
      ],
      
      wallet: [
        'POST /wallet/create - Create Miden account',
        'GET /wallet/:address - Get wallet details',
        'GET /wallet/:address/balance - Get balance',
        'POST /wallet/sync - Sync with Miden testnet'
      ],
      
      health: [
        'GET /health - Overall health check',
        'GET /health/miden - Miden client status',
        'GET /health/ipfs - IPFS status'
      ]
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Obscura × Miden Backend Server Started`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Port: ${PORT}`);
  logger.info(`🔗 Miden RPC: ${process.env.MIDEN_RPC_URL}`);
  logger.info(`📁 API Prefix: ${API_PREFIX}`);
  logger.info(`🔐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  
  // Initialize Miden client
  try {
    const midenClient = require('./services/midenClient');
    await midenClient.sync();
    logger.info('✅ Miden client synchronized with testnet');
  } catch (error) {
    logger.warn('⚠️  Miden client not available, using simulation mode');
    logger.warn(`Error: ${error.message}`);
  }
  
  logger.info('');
  logger.info('📚 API Documentation: http://localhost:' + PORT + '/docs');
  logger.info('🏥 Health Check: http://localhost:' + PORT + API_PREFIX + '/health');
  logger.info('');
  logger.info('✅ Server ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
