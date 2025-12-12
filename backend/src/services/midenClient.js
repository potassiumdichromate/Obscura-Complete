/**
 * Miden Client Service - v0.12 with Escrow + ZK Proofs (Accreditation + Jurisdiction)
 * 
 * Connects Node.js backend to Rust Miden service
 * Architecture: Node.js (Express) → Rust (Axum) → Miden Testnet
 */

const axios = require('axios');

class MidenClientService {
  constructor() {
    this.rustServiceUrl = process.env.MIDEN_RUST_SERVICE_URL || 'http://localhost:3000';
    this.timeout = 180000; // 180 second timeout
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
  // ZK PROOF OPERATIONS - ACCREDITATION
  // ============================================================================

  async generateAccreditationProof(netWorth, threshold = 1000000) {
    try {
      console.log('🔐 Generating accreditation proof...');
      console.log(`   Threshold: $${threshold.toLocaleString()} (public)`);
      console.log(`   Net worth: $${netWorth.toLocaleString()} (PRIVATE - stays hidden)`);
      
      const response = await this.client.post('/generate-accreditation-proof', {
        net_worth: netWorth,
        threshold: threshold
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Proof generation failed');
      }

      console.log('✅ ZK proof generated successfully!');
      console.log('   ℹ️  Your net worth is NOT revealed in the proof');

      return {
        success: true,
        proof: response.data.proof.proof,
        programHash: response.data.proof.program_hash,
        publicInputs: response.data.proof.public_inputs,
        proofType: response.data.proof.proof_type,
        timestamp: response.data.proof.timestamp
      };
    } catch (error) {
      console.error('Generate proof failed:', error.message);
      
      if (error.response?.status === 422) {
        throw new Error('Invalid input: Net worth does not meet threshold');
      }
      
      throw new Error(`Failed to generate accreditation proof: ${error.message}`);
    }
  }

  async verifyAccreditationProof(proof) {
    try {
      console.log('🔍 Verifying accreditation proof...');
      
      const response = await this.client.post('/verify-accreditation-proof', {
        proof: proof.proof,
        program_hash: proof.programHash,
        public_inputs: proof.publicInputs
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Proof verification failed');
      }

      const isValid = response.data.valid;
      
      if (isValid) {
        console.log('✅ Proof VERIFIED! User is accredited.');
        console.log(`   Threshold met: $${response.data.threshold.toLocaleString()}`);
      } else {
        console.log('❌ Proof verification FAILED');
      }

      return {
        success: true,
        valid: response.data.valid,
        threshold: response.data.threshold,
        verifiedAt: response.data.verified_at,
        proofType: response.data.proof_type
      };
    } catch (error) {
      console.error('Verify proof failed:', error.message);
      throw new Error(`Failed to verify accreditation proof: ${error.message}`);
    }
  }

  // ============================================================================
  // ZK PROOF OPERATIONS - JURISDICTION (NEW!)
  // ============================================================================

  async generateJurisdictionProof(countryCode, restrictedCountries = ['US', 'KP', 'IR']) {
    try {
      console.log('🌍 Generating jurisdiction proof...');
      console.log(`   Country: ${countryCode} (PRIVATE - stays hidden)`);
      console.log(`   Restricted list: ${restrictedCountries.join(', ')} (public)`);
      
      const response = await this.client.post('/generate-jurisdiction-proof', {
        country_code: countryCode,
        restricted_countries: restrictedCountries
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Jurisdiction proof generation failed');
      }

      console.log('✅ Jurisdiction proof generated successfully!');
      console.log('   ℹ️  Your country is NOT revealed in the proof');

      return {
        success: true,
        proof: response.data.proof.proof,
        programHash: response.data.proof.program_hash,
        publicInputs: response.data.proof.public_inputs,
        proofType: response.data.proof.proof_type,
        timestamp: response.data.proof.timestamp,
        restrictedCount: response.data.proof.restricted_count
      };
    } catch (error) {
      console.error('Generate jurisdiction proof failed:', error.message);
      
      if (error.response?.status === 422) {
        throw new Error('Invalid: User is in a restricted jurisdiction');
      }
      
      throw new Error(`Failed to generate jurisdiction proof: ${error.message}`);
    }
  }

  async verifyJurisdictionProof(proof) {
    try {
      console.log('🔍 Verifying jurisdiction proof...');
      
      const response = await this.client.post('/verify-jurisdiction-proof', {
        proof: proof.proof,
        program_hash: proof.programHash,
        public_inputs: proof.publicInputs
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Jurisdiction proof verification failed');
      }

      const isValid = response.data.valid;
      
      if (isValid) {
        console.log('✅ Jurisdiction proof VERIFIED! User is compliant.');
        console.log('   User is NOT in restricted jurisdiction');
      } else {
        console.log('❌ Jurisdiction proof verification FAILED');
      }

      return {
        success: true,
        valid: response.data.valid,
        verifiedAt: response.data.verified_at,
        proofType: response.data.proof_type,
        message: response.data.message
      };
    } catch (error) {
      console.error('Verify jurisdiction proof failed:', error.message);
      throw new Error(`Failed to verify jurisdiction proof: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

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

  async batchMintProperties(properties) {
    try {
      console.log(`🏗️  Batch minting ${properties.length} properties...`);
      
      const results = [];
      for (const property of properties) {
        try {
          const result = await this.createPropertyToken(property);
          results.push(result);
          
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

  async createPropertyNote(propertyData, ownerAccountId) {
    console.warn('⚠️  createPropertyNote is deprecated, use createPropertyToken');
    return this.createPropertyToken(propertyData, ownerAccountId);
  }

  async initialize() {
    console.warn('⚠️  initialize() is deprecated. Rust service initializes automatically.');
    return { success: true, message: 'Rust service handles initialization' };
  }

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

module.exports = new MidenClientService();