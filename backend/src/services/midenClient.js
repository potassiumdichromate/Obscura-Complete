/**
 * Miden Client Service - Complete v0.12 Integration with Escrow System
 * 
 * Connects Node.js backend to Rust Miden service
 * Architecture: Node.js (Express) → Rust (Axum) → Miden Testnet
 */

const axios = require('axios');

class MidenClientService {
  constructor() {
    this.rustServiceUrl = process.env.MIDEN_RUST_SERVICE_URL || 'http://localhost:3000';
    this.timeout = 60000; // 60 second timeout for blockchain operations
    this.explorerUrl = 'https://testnet.midenscan.com';
    
    this.client = axios.create({
      baseURL: this.rustServiceUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`🔗 Miden Client Service initialized (Rust Service: ${this.rustServiceUrl})`);
  }

  // ============================================================================
  // CORE BLOCKCHAIN OPERATIONS
  // ============================================================================

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        connected: true,
        service: response.data.service,
        rustService: 'online'
      };
    } catch (error) {
      console.error('Health check failed:', error.message);
      return {
        status: 'unhealthy',
        connected: false,
        rustService: 'offline',
        error: error.message
      };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    try {
      const response = await this.client.get('/get-account');
      
      if (response.data.success) {
        return {
          success: true,
          accounts: response.data.data,
          alice_account: response.data.data.alice_account,
          faucet_account: response.data.data.faucet_account
        };
      }
      
      throw new Error(response.data.error || 'Failed to get account info');
    } catch (error) {
      console.error('Get account info failed:', error.message);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Create/Mint a property NFT token
   */
  async createPropertyToken(propertyData, ownerAccountId = 'alice') {
    try {
      console.log('🏗️  Creating property token:', propertyData.id);
      
      const payload = {
        property_id: propertyData.id,
        owner_account_id: ownerAccountId,
        ipfs_cid: propertyData.ipfsCid || propertyData.ipfs_cid || '',
        property_type: this.getPropertyTypeCode(propertyData.type),
        price: parseInt(propertyData.price) || 0
      };
      
      const response = await this.client.post('/mint-property', payload);
      
      if (response.data.success) {
        console.log('✅ Property token created!');
        console.log(`   TX: ${response.data.transaction_id}`);
        console.log(`   Note: ${response.data.note_id}`);
        
        return {
          success: true,
          transactionId: response.data.transaction_id,
          noteId: response.data.note_id,
          propertyId: propertyData.id,
          explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
        };
      }
      
      throw new Error(response.data.error || 'Minting failed');
    } catch (error) {
      console.error('Property token creation failed:', error.message);
      throw new Error(`Failed to create property token: ${error.message}`);
    }
  }

  /**
   * Get consumable notes
   */
  async getConsumableNotes(accountId = null) {
    try {
      console.log('📋 Getting consumable notes...');
      
      const response = await this.client.get('/get-consumable-notes', {
        params: accountId ? { account_id: accountId } : {}
      });
      
      if (response.data.success) {
        console.log(`✅ Found ${response.data.notes.length} consumable notes`);
        return {
          success: true,
          notes: response.data.notes
        };
      }
      
      throw new Error(response.data.error || 'Failed to get consumable notes');
    } catch (error) {
      console.error('Get consumable notes failed:', error.message);
      throw new Error(`Failed to get consumable notes: ${error.message}`);
    }
  }

  /**
   * Consume note (add to account balance)
   */
  async consumeNote(noteId) {
    try {
      console.log('🔥 Consuming note:', noteId);
      
      const response = await this.client.post('/consume-note', {
        note_id: noteId
      });
      
      if (response.data.success) {
        console.log('✅ Note consumed!');
        console.log(`   TX: ${response.data.transaction_id}`);
        
        return {
          success: true,
          transactionId: response.data.transaction_id,
          explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
        };
      }
      
      throw new Error(response.data.error || 'Consume failed');
    } catch (error) {
      console.error('Consume note failed:', error.message);
      throw new Error(`Failed to consume note: ${error.message}`);
    }
  }

  /**
   * Transfer property ownership
   */
  async transferProperty(propertyId, toAccountId) {
    try {
      console.log('🔄 Transferring property:', propertyId);
      console.log('   To:', toAccountId);
      
      const response = await this.client.post('/transfer-property', {
        property_id: propertyId,
        to_account_id: toAccountId
      });
      
      if (response.data.success) {
        console.log('✅ Property transferred!');
        console.log(`   TX: ${response.data.transaction_id}`);
        
        return {
          success: true,
          transactionId: response.data.transaction_id,
          explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
        };
      }
      
      throw new Error(response.data.error || 'Transfer failed');
    } catch (error) {
      console.error('Transfer property failed:', error.message);
      throw new Error(`Failed to transfer property: ${error.message}`);
    }
  }

  /**
   * Send tokens
   */
  async sendTokens(toAccountId, amount) {
    try {
      console.log('💸 Sending tokens:', amount, 'to', toAccountId);
      
      const response = await this.client.post('/send-tokens', {
        to_account_id: toAccountId,
        amount: parseInt(amount)
      });
      
      if (response.data.success) {
        console.log('✅ Tokens sent!');
        console.log(`   TX: ${response.data.transaction_id}`);
        
        return {
          success: true,
          transactionId: response.data.transaction_id,
          explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
        };
      }
      
      throw new Error(response.data.error || 'Send tokens failed');
    } catch (error) {
      console.error('Send tokens failed:', error.message);
      throw new Error(`Failed to send tokens: ${error.message}`);
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId = 'alice') {
    try {
      console.log('💰 Getting balance for:', accountId);
      
      const response = await this.client.get(`/get-balance/${accountId}`);
      
      if (response.data.success) {
        console.log('✅ Balance retrieved');
        return {
          success: true,
          balance: response.data.balance
        };
      }
      
      throw new Error(response.data.error || 'Failed to get balance');
    } catch (error) {
      console.error('Get balance failed:', error.message);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  // ============================================================================
  // ESCROW SYSTEM
  // ============================================================================

  /**
   * Create escrow account for property transaction
   * @param {string} buyerAccountId - Buyer's Miden account ID
   * @param {string} sellerAccountId - Seller's Miden account ID
   * @param {number} amount - Amount to escrow
   * @returns {Promise<Object>} Escrow details
   */
  async createEscrow(buyerAccountId, sellerAccountId, amount) {
    try {
      console.log(`🔒 Creating escrow: buyer=${buyerAccountId}, seller=${sellerAccountId}, amount=${amount}`);
      
      const response = await this.client.post('/create-escrow', {
        buyer_account_id: buyerAccountId,
        seller_account_id: sellerAccountId,
        amount
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create escrow');
      }

      console.log(`✅ Escrow created: ${response.data.escrow.escrow_account_id}`);

      return {
        escrowAccountId: response.data.escrow.escrow_account_id,
        buyerAccountId: response.data.escrow.buyer_account_id,
        sellerAccountId: response.data.escrow.seller_account_id,
        amount: response.data.escrow.amount,
        status: response.data.escrow.status
      };
    } catch (error) {
      console.error('Create escrow failed:', error.message);
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Fund escrow (buyer sends tokens to escrow)
   * @param {Object} escrow - Escrow details
   * @returns {Promise<Object>} Transaction details
   */
  async fundEscrow(escrow) {
    try {
      console.log(`💰 Funding escrow: ${escrow.escrowAccountId}`);
      
      const response = await this.client.post('/fund-escrow', {
        escrow_account_id: escrow.escrowAccountId,
        buyer_account_id: escrow.buyerAccountId,
        seller_account_id: escrow.sellerAccountId,
        amount: escrow.amount
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fund escrow');
      }

      console.log(`✅ Escrow funded: TX ${response.data.transaction_id}`);

      return {
        transactionId: response.data.transaction_id,
        explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
      };
    } catch (error) {
      console.error('Fund escrow failed:', error.message);
      throw new Error(`Failed to fund escrow: ${error.message}`);
    }
  }

  /**
   * Release escrow funds to seller (on successful sale)
   * @param {Object} escrow - Escrow details
   * @returns {Promise<Object>} Transaction details
   */
  async releaseEscrow(escrow) {
    try {
      console.log(`🔓 Releasing escrow to seller: ${escrow.escrowAccountId}`);
      
      const response = await this.client.post('/release-escrow', {
        escrow_account_id: escrow.escrowAccountId,
        buyer_account_id: escrow.buyerAccountId,
        seller_account_id: escrow.sellerAccountId,
        amount: escrow.amount
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to release escrow');
      }

      console.log(`✅ Escrow released: TX ${response.data.transaction_id}`);

      return {
        transactionId: response.data.transaction_id,
        explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
      };
    } catch (error) {
      console.error('Release escrow failed:', error.message);
      throw new Error(`Failed to release escrow: ${error.message}`);
    }
  }

  /**
   * Refund escrow to buyer (if sale fails)
   * @param {Object} escrow - Escrow details
   * @returns {Promise<Object>} Transaction details
   */
  async refundEscrow(escrow) {
    try {
      console.log(`↩️  Refunding escrow to buyer: ${escrow.escrowAccountId}`);
      
      const response = await this.client.post('/refund-escrow', {
        escrow_account_id: escrow.escrowAccountId,
        buyer_account_id: escrow.buyerAccountId,
        seller_account_id: escrow.sellerAccountId,
        amount: escrow.amount
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to refund escrow');
      }

      console.log(`✅ Escrow refunded: TX ${response.data.transaction_id}`);

      return {
        transactionId: response.data.transaction_id,
        explorerUrl: `${this.explorerUrl}/tx/${response.data.transaction_id}`
      };
    } catch (error) {
      console.error('Refund escrow failed:', error.message);
      throw new Error(`Failed to refund escrow: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Verify transaction on MidenScan
   */
  async verifyTransaction(transactionId) {
    try {
      const explorerUrl = `${this.explorerUrl}/tx/${transactionId}`;
      
      return {
        success: true,
        transactionId,
        explorerUrl,
        status: 'submitted',
        message: 'Transaction submitted to Miden testnet. Check MidenScan for confirmation.'
      };
    } catch (error) {
      console.error('Transaction verification failed:', error.message);
      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  /**
   * Batch mint properties
   */
  async batchMintProperties(properties) {
    try {
      console.log(`🏗️  Batch minting ${properties.length} properties...`);
      
      const results = [];
      for (const property of properties) {
        try {
          const result = await this.createPropertyToken(property);
          results.push(result);
          
          // Small delay between mints
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to mint property ${property.id}:`, error.message);
          results.push({
            success: false,
            propertyId: property.id,
            error: error.message
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Batch mint complete: ${successCount}/${properties.length} successful`);
      
      return results;
    } catch (error) {
      console.error('Batch mint failed:', error.message);
      throw new Error(`Batch mint failed: ${error.message}`);
    }
  }

  // ============================================================================
  // LEGACY/DEPRECATED METHODS (for backwards compatibility)
  // ============================================================================

  /**
   * @deprecated Use createPropertyToken instead
   */
  async createPropertyNote(propertyData, ownerAccountId) {
    console.warn('⚠️  createPropertyNote is deprecated, use createPropertyToken');
    return this.createPropertyToken(propertyData, ownerAccountId);
  }

  /**
   * @deprecated Rust service handles initialization automatically
   */
  async initialize() {
    console.warn('⚠️  initialize() is deprecated. Rust service initializes automatically.');
    return { success: true, message: 'Rust service handles initialization' };
  }

  /**
   * @deprecated Rust service syncs automatically
   */
  async sync() {
    console.warn('⚠️  sync() is deprecated. Rust service syncs automatically.');
    return { success: true, message: 'Rust service syncs automatically' };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  getPropertyTypeCode(type) {
    const types = {
      'residential': 0,
      'commercial': 1,
      'land': 2,
      'token': 0
    };
    return types[type?.toLowerCase()] || 0;
  }

  formatPropertyData(property) {
    return {
      id: property.id || property.property_id,
      ipfsCid: property.ipfsCid || property.ipfs_cid || '',
      type: property.type || property.property_type || 'residential',
      price: parseInt(property.price) || 0
    };
  }

  getExplorerAccountUrl(accountId) {
    return `${this.explorerUrl}/account/${accountId}`;
  }

  getExplorerTxUrl(txId) {
    return `${this.explorerUrl}/tx/${txId}`;
  }

  getExplorerNoteUrl(noteId) {
    return `${this.explorerUrl}/note/${noteId}`;
  }
}

// Export singleton instance
module.exports = new MidenClientService();