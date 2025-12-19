import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TransactionLog = ({ transaction }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const openExplorer = (txId) => {
    if (txId) {
      window.open(`https://testnet.midenscan.com/tx/${txId}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{transaction.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{transaction.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {transaction.status === 'success' && (
            <span className="proof-verified">
              <Check className="w-4 h-4" />
              Success
            </span>
          )}
          {transaction.status === 'pending' && (
            <span className="proof-pending">Processing</span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-sm text-gray-400">
        {format(new Date(transaction.timestamp), 'PPpp')}
      </div>

      {/* Transaction Details */}
      <div className="space-y-3">
        {transaction.noteId && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Note ID</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-sm font-mono bg-white/5 px-3 py-2 rounded border border-white/10">
                {transaction.noteId}
              </code>
              <button
                onClick={() => copyToClipboard(transaction.noteId)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {transaction.transactionId && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Transaction Hash</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => openExplorer(transaction.transactionId)}
                className="flex-1 text-sm font-mono bg-white/5 px-3 py-2 rounded border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>{truncateHash(transaction.transactionId)}</span>
                <ExternalLink className="w-4 h-4 text-miden-blue" />
              </button>
              <button
                onClick={() => copyToClipboard(transaction.transactionId)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {transaction.propertyId && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Property ID</label>
            <div className="text-sm font-mono bg-white/5 px-3 py-2 rounded border border-white/10 mt-1">
              {transaction.propertyId}
            </div>
          </div>
        )}

        {transaction.proofId && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Proof ID</label>
            <div className="text-sm font-mono bg-white/5 px-3 py-2 rounded border border-white/10 mt-1">
              {transaction.proofId}
            </div>
          </div>
        )}

        {transaction.ipfsCid && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">IPFS CID</label>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={`https://gateway.pinata.cloud/ipfs/${transaction.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-mono bg-white/5 px-3 py-2 rounded border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>{truncateHash(transaction.ipfsCid)}</span>
                <ExternalLink className="w-4 h-4 text-miden-cyan" />
              </a>
            </div>
          </div>
        )}

        {transaction.amount && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Amount</label>
            <div className="text-xl font-bold text-miden-gold mt-1">
              ${transaction.amount.toLocaleString()}
            </div>
          </div>
        )}

        {/* Additional Data */}
        {transaction.data && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Additional Details</label>
            <pre className="text-xs font-mono bg-white/5 px-3 py-2 rounded border border-white/10 mt-1 overflow-auto max-h-40">
              {JSON.stringify(transaction.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TransactionLog;
