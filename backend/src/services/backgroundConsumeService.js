// File: backend/src/services/backgroundConsumeService.js
// Background note consumption service - runs async after minting
// FIXED: Now passes owner account ID to consume function

const Property = require('../models/Property');
const midenClient = require('./midenClient');

class BackgroundConsumeService {
  constructor() {
    this.activeConsumes = new Map(); // Track in-progress consumes
  }

  /**
   * Start consuming note in background (non-blocking)
   * This is called immediately after minting
   */
  async startConsumeInBackground(propertyId, noteId) {
    console.log(`🔥 Starting background consume for property: ${propertyId}`);
    
    // Don't await - let it run in background
    this.consumeNoteAsync(propertyId, noteId)
      .catch(err => {
        console.error(`❌ Background consume failed for ${propertyId}:`, err.message);
      });
    
    return {
      success: true,
      message: 'Note consumption started in background'
    };
  }

  /**
   * Async note consumption (runs in background)
   * Takes ~8 minutes but doesn't block user
   * FIXED: Now gets owner account and passes it to consume
   */
  async consumeNoteAsync(propertyId, noteId) {
    try {
      // Get property to find owner
      const property = await Property.findOne({ propertyId });
      if (!property) {
        throw new Error(`Property ${propertyId} not found`);
      }

      // Update status to 'consuming'
      await Property.findOneAndUpdate(
        { propertyId },
        { 
          consumeStatus: 'consuming',
          consumeStartedAt: new Date()
        }
      );

      console.log(`⏳ Consuming note for ${propertyId} (this will take ~8 minutes)...`);
      console.log(`   Owner: ${property.ownerAccountId}`);
      
      // Check if it's a real note ID or placeholder
      if (noteId.startsWith('0x6e6f74')) {
        // This is a hex-encoded placeholder like "0x6e6f74652d50524f50..."
        // Decode it to check
        const decoded = Buffer.from(noteId.slice(2), 'hex').toString();
        if (decoded.startsWith('note-PROP-')) {
          console.log(`📋 Placeholder note ID detected: ${decoded}`);
          console.log(`   Waiting for real note to be available...`);
          
          // Wait 2 minutes for note to propagate, then get real note ID
          await this.sleep(120000); // 2 minutes
          
          // ✅ Get real consumable notes for the OWNER's account
          const notesResult = await midenClient.getConsumableNotes(property.ownerAccountId);
          
          if (notesResult.success && notesResult.notes.length > 0) {
            // Use the most recent note
            const realNoteId = notesResult.notes[notesResult.notes.length - 1].note_id;
            console.log(`✅ Got real note ID: ${realNoteId}`);
            noteId = realNoteId;
            
            // Update property with real note ID
            await Property.findOneAndUpdate(
              { propertyId },
              { midenNoteId: realNoteId }
            );
          }
        }
      }

      // ✅ Actually consume the note with the OWNER's account ID!
      console.log(`🔥 Consuming note ${noteId} for account: ${property.ownerAccountId}`);
      const result = await midenClient.consumeNote(noteId, property.ownerAccountId);

      if (result.success) {
        console.log(`✅ Background consume succeeded for ${propertyId}`);
        console.log(`   TX: ${result.transactionId}`);

        // Update property status
        await Property.findOneAndUpdate(
          { propertyId },
          { 
            consumeStatus: 'consumed',
            consumeCompletedAt: new Date(),
            consumeTransactionId: result.transactionId,
            consumeError: null
          }
        );

        return {
          success: true,
          transactionId: result.transactionId
        };
      } else {
        throw new Error(result.error || 'Consume failed');
      }

    } catch (error) {
      console.error(`❌ Background consume error for ${propertyId}:`, error.message);

      // Get current property to check retry count
      const property = await Property.findOne({ propertyId });
      
      if (property && property.consumeRetries < 3) {
        // Retry
        const newRetryCount = property.consumeRetries + 1;
        console.log(`🔄 Retrying consume for ${propertyId} (attempt ${newRetryCount}/3)...`);
        
        await Property.findOneAndUpdate(
          { propertyId },
          { 
            consumeStatus: 'pending',
            consumeRetries: newRetryCount,
            consumeError: error.message
          }
        );

        // Retry after 1 minute
        await this.sleep(60000);
        return this.consumeNoteAsync(propertyId, noteId);
        
      } else {
        // Max retries reached - mark as failed
        await Property.findOneAndUpdate(
          { propertyId },
          { 
            consumeStatus: 'failed',
            consumeError: error.message,
            consumeCompletedAt: new Date()
          }
        );

        throw error;
      }
    }
  }

  /**
   * Check consume status for a property
   */
  async getConsumeStatus(propertyId) {
    const property = await Property.findOne({ propertyId });
    
    if (!property) {
      return {
        success: false,
        error: 'Property not found'
      };
    }

    return {
      success: true,
      propertyId: property.propertyId,
      consumeStatus: property.consumeStatus,
      consumeStartedAt: property.consumeStartedAt,
      consumeCompletedAt: property.consumeCompletedAt,
      consumeError: property.consumeError,
      readyForSettlement: property.consumeStatus === 'consumed',
      canRetry: property.canRetryConsume()
    };
  }

  /**
   * Manually retry failed consume
   */
  async retryConsume(propertyId) {
    const property = await Property.findOne({ propertyId });
    
    if (!property) {
      throw new Error('Property not found');
    }

    if (!property.canRetryConsume()) {
      throw new Error('Cannot retry - max retries reached or not in failed state');
    }

    console.log(`🔄 Manual retry for ${propertyId}`);
    
    return this.startConsumeInBackground(propertyId, property.midenNoteId);
  }

  /**
   * Helper: Sleep for ms milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all properties with pending consumes
   */
  async getPendingConsumes() {
    const properties = await Property.find({
      consumeStatus: { $in: ['pending', 'consuming'] }
    }).select('propertyId consumeStatus consumeStartedAt metadata.title');

    return properties.map(p => ({
      propertyId: p.propertyId,
      title: p.metadata.title,
      status: p.consumeStatus,
      startedAt: p.consumeStartedAt,
      duration: p.consumeStartedAt 
        ? Math.floor((Date.now() - p.consumeStartedAt.getTime()) / 1000)
        : 0
    }));
  }
}

module.exports = new BackgroundConsumeService();