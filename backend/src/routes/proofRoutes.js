/**
 * Proof Routes - ZK Proof Management
 * 8 endpoints for proof generation and verification
 */

const express = require('express');
const router = express.Router();
const proofController = require('../controllers/proofController');

/**
 * @route   POST /api/v1/proofs/ownership
 * @desc    Generate ownership proof
 * @access  Public
 */
router.post('/ownership', proofController.generateOwnershipProof);

/**
 * @route   POST /api/v1/proofs/accreditation
 * @desc    Generate accreditation proof
 * @access  Public
 */
router.post('/accreditation', proofController.generateAccreditationProof);

/**
 * @route   POST /api/v1/proofs/jurisdiction
 * @desc    Generate jurisdiction proof
 * @access  Public
 */
router.post('/jurisdiction', proofController.generateJurisdictionProof);

/**
 * @route   POST /api/v1/proofs/verify
 * @desc    Verify single proof
 * @access  Public
 */
router.post('/verify', proofController.verifyProof);

/**
 * @route   POST /api/v1/proofs/batch-verify
 * @desc    Verify multiple proofs
 * @access  Public
 */
router.post('/batch-verify', proofController.batchVerifyProofs);

/**
 * @route   GET /api/v1/proofs/:id
 * @desc    Get proof details
 * @access  Public
 */
router.get('/:id', proofController.getProof);

/**
 * @route   GET /api/v1/proofs/user/:userId
 * @desc    Get all proofs for user
 * @access  Public
 */
router.get('/user/:userId', proofController.getUserProofs);

/**
 * @route   DELETE /api/v1/proofs/:id
 * @desc    Delete proof
 * @access  Owner only
 */
router.delete('/:id', proofController.deleteProof);

module.exports = router;
