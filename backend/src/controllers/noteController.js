// File: backend/src/controllers/noteController.js
// Controller for note operations (consume, get consumable notes)

const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');

class NoteController {
  /**
   * Get consumable notes
   * GET /api/v1/notes/consumable
   */
  async getConsumableNotes(req, res) {
    try {
      const { accountId } = req.query;
      
      logger.info('Getting consumable notes', { accountId });
      
      const result = await midenClient.getConsumableNotes(accountId);
      
      res.json({
        success: true,
        notes: result.notes,
        count: result.notes.length
      });
    } catch (error) {
      logger.error('Get consumable notes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get consumable notes',
        details: error.message
      });
    }
  }

  /**
   * Consume a note (add to account balance)
   * POST /api/v1/notes/consume
   * Body: { noteId: "0x..." }
   */
  async consumeNote(req, res) {
    try {
      const { noteId } = req.body;
      
      if (!noteId) {
        return res.status(400).json({
          success: false,
          error: 'Missing noteId'
        });
      }
      
      logger.info('Consuming note', { noteId });
      
      const result = await midenClient.consumeNote(noteId);
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        explorerUrl: result.explorerUrl,
        message: 'Note consumed successfully'
      });
    } catch (error) {
      logger.error('Consume note error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to consume note',
        details: error.message
      });
    }
  }

  /**
   * Get note details
   * GET /api/v1/notes/:noteId
   */
  async getNoteDetails(req, res) {
    try {
      const { noteId } = req.params;
      
      logger.info('Getting note details', { noteId });
      
      // This would call a Rust endpoint if available
      res.json({
        success: true,
        noteId,
        message: 'Note details endpoint - implement in Rust service'
      });
    } catch (error) {
      logger.error('Get note details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get note details'
      });
    }
  }
}

module.exports = new NoteController();