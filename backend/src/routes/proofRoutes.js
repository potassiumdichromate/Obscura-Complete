// File: backend/src/routes/proofRoutes.js
// UPDATED: Merged with ownership proofs and dashboard APIs

const express = require('express');
const router = express.Router();
const proofController = require('../controllers/proofController');

// NO AUTHENTICATION REQUIRED - FOR POC ONLY

// ============================================================================
// ACCREDITATION PROOF ROUTES (EXISTING)
// ============================================================================

// Generate accreditation proof
router.post('/generate-accreditation', proofController.generateAccreditationProof);

// Get proofs (optionally filter by userIdentifier)
router.get('/my-proofs', proofController.getMyProofs);

// Check accreditation proof requirement
router.post('/check-requirement', proofController.checkProofRequirement);

// Clear all proofs (for testing)
router.delete('/clear-all', proofController.clearAllProofs);

// ============================================================================
// JURISDICTION PROOF ROUTES (EXISTING)
// ============================================================================

// Generate jurisdiction proof
router.post('/generate-jurisdiction', proofController.generateJurisdictionProof);

// Get jurisdiction proofs for user
router.get('/jurisdiction', proofController.getJurisdictionProofs);

// Check jurisdiction proof requirement
router.post('/check-jurisdiction', proofController.checkJurisdictionRequirement);

// ============================================================================
// OWNERSHIP PROOF ROUTES (NEW!)
// ============================================================================

// Generate ownership proof
router.post('/generate-ownership', proofController.generateOwnershipProof);

// Verify ownership proof
router.post('/verify-ownership', proofController.verifyOwnershipProof);

// ============================================================================
// DASHBOARD APIS (NEW!)
// ============================================================================

// Get public proof event log
router.get('/events/public', proofController.getPublicProofEvents);

// Get user's proof history (detailed)
router.get('/history/my', proofController.getMyProofHistory);

// Get proof verification result (public)
router.get('/verification/:proofId', proofController.getProofVerificationResult);

// Get platform proof statistics
router.get('/statistics', proofController.getProofStatistics);

// ============================================================================
// NOTE: Get specific proof by ID should be LAST to avoid route conflicts
// ============================================================================
router.get('/:proofId', proofController.getProofById);

module.exports = router;