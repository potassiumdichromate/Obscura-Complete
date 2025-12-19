import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Zap, Loader, ExternalLink } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import TransactionLog from '../components/TransactionLog';

const Platform = () => {
  const { addTransaction } = useApp();
  const [loading, setLoading] = useState(false);
  const [offerId, setOfferId] = useState('');
  const [settlementCheck, setSettlementCheck] = useState(null);
  const [settlementResult, setSettlementResult] = useState(null);

  const checkCompliance = async () => {
    if (!offerId) {
      toast.error('Please enter an offer ID');
      return;
    }

    setLoading(true);
    try {
      const data = await api.checkSettlementReady(offerId);
      setSettlementCheck(data);
      
      if (data.readyToSettle) {
        toast.success('✅ All compliance requirements met!');
      } else {
        toast.error('❌ Compliance requirements not met');
      }
    } catch (error) {
      toast.error('Failed to check compliance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const executeSettlement = async () => {
    if (!offerId) {
      toast.error('Please enter an offer ID');
      return;
    }

    setLoading(true);
    try {
      const data = await api.executeSettlement(offerId);
      setSettlementResult(data.settlement);
      
      addTransaction({
        title: 'Atomic Settlement Executed',
        description: 'Ownership transferred and funds released',
        status: 'success',
        timestamp: new Date().toISOString(),
        propertyId: data.settlement.propertyId,
        transactionId: data.settlement.blockchain.propertyTransferTx,
        amount: data.settlement.price,
        data: data.settlement,
      });

      toast.success('🎉 Settlement executed successfully!');
    } catch (error) {
      toast.error('Failed to execute settlement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Platform Operations</h1>
              <p className="text-gray-400">Verify compliance and execute settlements</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Step 15: Verify Compliance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="step-active">15</div>
              <div>
                <h2 className="text-2xl font-bold">Verify Compliance</h2>
                <p className="text-gray-400">Check all requirements before settlement</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Offer ID</label>
                <input
                  type="text"
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  placeholder="OFFER-1234567890"
                  className="input-field"
                />
              </div>

              <button
                onClick={checkCompliance}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify Compliance
                  </>
                )}
              </button>

              {settlementCheck && (
                <div className="mt-6 space-y-3">
                  <div className={`p-4 rounded-lg border ${
                    settlementCheck.readyToSettle 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="font-bold mb-2">
                      {settlementCheck.readyToSettle ? '✅ Ready to Settle' : '❌ Not Ready'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(settlementCheck.checks).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className={value ? 'text-green-400' : 'text-red-400'}>
                          {value ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Step 16: Execute Settlement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="step-active">16</div>
              <div>
                <h2 className="text-2xl font-bold">Execute Settlement</h2>
                <p className="text-gray-400">Atomic ownership transfer + fund release</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm text-blue-300">
                  ⚡ This will execute an atomic transaction that simultaneously:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Transfer property ownership to buyer</li>
                    <li>Release escrowed funds to seller</li>
                    <li>Update property status on-chain</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={executeSettlement}
                disabled={loading || !settlementCheck?.readyToSettle}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Execute Atomic Settlement
                  </>
                )}
              </button>

              {settlementResult && (
                <div className="mt-6 space-y-4">
                  <div className="proof-verified flex items-center gap-2 justify-center text-lg py-4">
                    <CheckCircle className="w-6 h-6" />
                    Settlement Complete!
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Property Transfer TX</div>
                      <a
                        href={settlementResult.blockchain.explorerUrls.propertyTransfer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-mono text-miden-blue hover:text-miden-cyan mt-1"
                      >
                        {settlementResult.blockchain.propertyTransferTx.slice(0, 20)}...
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Escrow Release TX</div>
                      <a
                        href={settlementResult.blockchain.explorerUrls.escrowRelease}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-mono text-miden-blue hover:text-miden-cyan mt-1"
                      >
                        {settlementResult.blockchain.escrowReleaseTx.slice(0, 20)}...
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Amount Settled</div>
                      <div className="text-2xl font-bold text-miden-gold mt-1">
                        ${settlementResult.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Platform;
