/**
 * Account Manager - Miden Account Operations
 */
const midenClient = require('./midenClient');
const logger = require('../utils/logger');

class AccountManager {
  async createAccount(accountType = 'regular') {
    logger.info('Creating Miden account', { accountType });
    
    try {
      const result = await midenClient.createAccount(accountType);
      return result;
    } catch (error) {
      logger.error('Error creating account', { error: error.message });
      throw error;
    }
  }

  async getAccountDetails(accountId) {
    logger.info('Getting account details', { accountId });
    
    try {
      const balance = await midenClient.getAccountBalance(accountId);
      return { accountId, ...balance };
    } catch (error) {
      logger.error('Error getting account details', { error: error.message });
      throw error;
    }
  }

  async syncAccount(accountId) {
    logger.info('Syncing account', { accountId });
    await midenClient.sync();
    return { synced: true, timestamp: Date.now() };
  }
}

module.exports = new AccountManager();
