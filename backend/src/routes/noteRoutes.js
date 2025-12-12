// File: backend/src/routes/noteRoutes.js
// Routes for note operations

const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

/**
 * @route   GET /api/v1/notes/consumable
 * @desc    Get all consumable notes
 * @access  Public
 */
router.get('/consumable', noteController.getConsumableNotes);

/**
 * @route   POST /api/v1/notes/consume
 * @desc    Consume a note (add to account balance)
 * @access  Public
 * @body    { noteId: "0x..." }
 */
router.post('/consume', noteController.consumeNote);

/**
 * @route   GET /api/v1/notes/:noteId
 * @desc    Get note details
 * @access  Public
 */
router.get('/:noteId', noteController.getNoteDetails);

module.exports = router;