const midenClient = require('../services/midenClient');
const logger = require('../utils/logger');

exports.createWallet = async (req, res, next) => {
  try {
    const { accountType = 'regular', storageMode = 'onchain' } = req.body;
    const result = await midenClient.createAccount(accountType, storageMode);
    logger.info('Wallet created', { accountId: result.accountId });
    res.status(201).json({ success: true, accountId: result.accountId, explorerUrl: `${process.env.MIDEN_EXPLORER_URL}/account/${result.accountId}` });
  } catch (error) { logger.error('Error creating wallet', { error: error.message }); next(error); }
};

exports.getWallet = async (req, res, next) => {
  try {
    const { address } = req.params;
    res.json({ success: true, wallet: { address, network: 'Miden Testnet' } });
  } catch (error) { next(error); }
};

exports.getBalance = async (req, res, next) => {
  try {
    const { address } = req.params;
    const { balance } = await midenClient.getAccountBalance(address);
    res.json({ success: true, balance, address });
  } catch (error) { next(error); }
};

exports.syncWallet = async (req, res, next) => {
  try {
    await midenClient.sync();
    res.json({ success: true, message: 'Wallet synced with Miden testnet' });
  } catch (error) { next(error); }
};

module.exports = exports;
