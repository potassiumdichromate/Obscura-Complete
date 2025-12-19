const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');

exports.createWallet = async (req, res, next) => {
  try {
    const { accountType = 'regular', storageMode = 'onchain' } = req.body;
    const result = await midenClient.createAccount(accountType, storageMode);
    logger.info('Wallet created', { accountId: result.accountId });
    res.status(201).json({ 
      success: true, 
      accountId: result.accountId, 
      explorerUrl: `${process.env.MIDEN_EXPLORER_URL}/account/${result.accountId}` 
    });
  } catch (error) { 
    logger.error('Error creating wallet', { error: error.message }); 
    next(error); 
  }
};

exports.getWallet = async (req, res, next) => {
  try {
    const { address } = req.params;
    res.json({ 
      success: true, 
      wallet: { 
        address, 
        network: 'Miden Testnet' 
      } 
    });
  } catch (error) { 
    next(error); 
  }
};

exports.getBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    const { balance } = await midenClient.getAccountBalance(address);
    res.json({ 
      success: true, 
      balance, 
      address 
    });
  } catch (error) { 
    next(error); 
  }
};

exports.syncWallet = async (req, res, next) => {
  try {
    await midenClient.sync();
    res.json({ 
      success: true, 
      message: 'Wallet synced with Miden testnet' 
    });
  } catch (error) { 
    next(error); 
  }
};

// ============================================================================
// FUND WALLET WITH AUTO-CONSUME
// ============================================================================

/**
 * Fund a wallet with test tokens from faucet
 * AUTO-CONSUMES the note so tokens are immediately available in vault
 */
exports.fundWallet = async (req, res, next) => {
  try {
    const { accountId, amount } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountId and amount'
      });
    }

    logger.info('Funding wallet', { accountId, amount });
    console.log(`💰 Funding wallet: ${accountId} with ${amount} tokens`);

    // STEP 1: Send tokens from faucet (creates consumable note)
    const fundResult = await midenClient.sendTokens(accountId, amount);
    console.log(`✅ Tokens sent! TX: ${fundResult.transactionId}`);

    // STEP 2: Wait a bit for note propagation
    console.log(`⏳ Waiting 10 seconds for note propagation...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    // STEP 3: Auto-consume the note (adds tokens to vault)
    let consumeResult;
    try {
      console.log(`🔥 Auto-consuming note to add tokens to vault...`);
      
      const notes = await midenClient.getConsumableNotes(accountId);
      
      if (notes.success && notes.notes.length > 0) {
        const latestNote = notes.notes[notes.notes.length - 1];
        const noteId = latestNote.note_id;
        
        console.log(`📋 Found note to consume: ${noteId}`);
        consumeResult = await midenClient.consumeNote(noteId);
        console.log(`✅ Note consumed! TX: ${consumeResult.transactionId}`);
        
        logger.info('Note auto-consumed', { 
          noteId,
          consumeTransactionId: consumeResult.transactionId 
        });
      } else {
        console.log(`⚠️  No consumable notes found - may need manual consume later`);
      }
    } catch (consumeError) {
      console.error('⚠️  Auto-consume failed:', consumeError.message);
      logger.warn('Auto-consume failed', { error: consumeError.message });
    }

    res.json({
      success: true,
      message: consumeResult 
        ? 'Wallet funded and tokens added to vault ✅' 
        : 'Wallet funded - tokens sent (consume manually if needed) ⏳',
      wallet: {
        accountId,
        amountAdded: amount,
        fundTransactionId: fundResult.transactionId,
        consumeTransactionId: consumeResult?.transactionId,
        status: consumeResult ? 'ready' : 'pending_consume'
      },
      blockchain: {
        fundTx: fundResult.transactionId,
        consumeTx: consumeResult?.transactionId,
        explorerUrls: {
          fund: fundResult.explorerUrl,
          consume: consumeResult?.explorerUrl
        }
      },
      note: consumeResult 
        ? 'Tokens are now in vault and ready to use for escrow!' 
        : 'If auto-consume failed, manually consume the note using POST /api/v1/notes/consume'
    });
  } catch (error) {
    logger.error('Error funding wallet', { error: error.message });
    next(error);
  }
};

module.exports = exports;