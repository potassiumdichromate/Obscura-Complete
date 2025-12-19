import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Clock, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';

const ProofDashboard = () => {
  const { currentUser } = useApp();
  const [myProofs, setMyProofs] = useState([]);
  const [allProofs, setAllProofs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('public'); // 'public' or 'personal'
  const [filter, setFilter] = useState('all'); // 'all', 'ownership', 'accreditation', 'jurisdiction'

  useEffect(() => {
    loadPublicProofs();
  }, []);

  useEffect(() => {
    if (currentUser && view === 'personal') {
      loadMyProofs();
    }
  }, [currentUser, view]);

  const loadPublicProofs = async () => {
    setLoading(true);
    try {
      // This would normally fetch from a public proofs endpoint
      // For demo, we'll show that anyone can see proof events
      toast.success('Loading public proof events...');
    } catch (error) {
      console.error('Failed to load proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyProofs = async () => {
    if (!currentUser) {
      toast.error('Please connect wallet to view personal proofs');
      return;
    }

    setLoading(true);
    try {
      const data = await api.getMyProofs(currentUser);
      setMyProofs(data.proofs || []);
      toast.success(`Loaded ${data.count} proof(s)`);
    } catch (error) {
      console.error('Failed to load proofs:', error);
      toast.error('Failed to load personal proofs');
    } finally {
      setLoading(false);
    }
  };

  const getProofTypeColor = (type) => {
    switch (type) {
      case 'ownership':
        return 'from-purple-500 to-pink-500';
      case 'accreditation':
        return 'from-blue-500 to-cyan-500';
      case 'jurisdiction':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getProofTypeIcon = (type) => {
    switch (type) {
      case 'ownership':
        return '🏠';
      case 'accreditation':
        return '✅';
      case 'jurisdiction':
        return '🌍';
      default:
        return '🔐';
    }
  };

  const filteredProofs = view === 'personal' 
    ? (filter === 'all' ? myProofs : myProofs.filter(p => p.type === filter))
    : allProofs;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-miden-purple to-miden-blue flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Proof Dashboard</h1>
              <p className="text-gray-400">Transparency layer for zero-knowledge proofs</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="step-complete">17</div>
                <h3 className="font-bold">Proof Generation Events</h3>
              </div>
              <p className="text-sm text-gray-400">
                Anyone can view when proofs are generated (timestamp, type)
              </p>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="step-complete">18</div>
                <h3 className="font-bold">Verification Results</h3>
              </div>
              <p className="text-sm text-gray-400">
                Public verification status without revealing proof contents
              </p>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="step-complete">19</div>
                <h3 className="font-bold">Personal Proof History</h3>
              </div>
              <p className="text-sm text-gray-400">
                Users can view their own complete proof history and details
              </p>
            </div>
          </div>
        </motion.div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setView('public')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              view === 'public'
                ? 'bg-miden-blue text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Eye className="w-5 h-5 inline mr-2" />
            Public View (Steps 17-18)
          </button>

          <button
            onClick={() => setView('personal')}
            disabled={!currentUser}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              view === 'personal'
                ? 'bg-miden-purple text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Shield className="w-5 h-5 inline mr-2" />
            My Proofs (Step 19)
          </button>

          {view === 'personal' && !currentUser && (
            <span className="text-sm text-gray-400">
              Connect wallet to view personal proofs
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {['all', 'ownership', 'accreditation', 'jurisdiction'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === type
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {type === 'all' ? 'All Proofs' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Proof List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-16 h-16 border-4 border-miden-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Loading proofs...</p>
            </div>
          ) : filteredProofs.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">
                {view === 'personal' 
                  ? 'No proofs found. Generate some proofs first!' 
                  : 'No public proof events available'}
              </p>
            </div>
          ) : (
            filteredProofs.map((proof, index) => (
              <motion.div
                key={proof.proofId || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-6 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getProofTypeColor(proof.type)} flex items-center justify-center text-3xl flex-shrink-0`}>
                    {getProofTypeIcon(proof.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold capitalize">{proof.type} Proof</h3>
                        <p className="text-sm text-gray-400">
                          Generated {format(new Date(proof.createdAt), 'PPpp')}
                        </p>
                      </div>
                      
                      {proof.verified ? (
                        <span className="proof-verified">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="proof-failed">
                          <XCircle className="w-4 h-4" />
                          Invalid
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {view === 'personal' && proof.proofId && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Proof ID</div>
                          <div className="font-mono text-sm truncate">{proof.proofId}</div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs text-gray-500 uppercase">Type</div>
                        <div className="text-sm capitalize">{proof.type}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 uppercase">Created</div>
                        <div className="text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(proof.createdAt), 'PP')}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 uppercase">Expires</div>
                        <div className="text-sm">
                          {format(new Date(proof.expiresAt), 'PP')}
                        </div>
                      </div>

                      {view === 'personal' && proof.threshold && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Threshold</div>
                          <div className="text-sm">${proof.threshold.toLocaleString()}</div>
                        </div>
                      )}
                    </div>

                    {/* Privacy Note for Public View */}
                    {view === 'public' && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-300">
                          🔒 <strong>Privacy Preserved:</strong> You can see this proof was generated and verified, 
                          but the actual proof contents and user identity remain encrypted.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 glass-panel p-8"
        >
          <h3 className="text-2xl font-bold mb-4">How the Proof Dashboard Works</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-4xl mb-3">🌐</div>
              <h4 className="font-bold mb-2">Public Transparency</h4>
              <p className="text-sm text-gray-400">
                Anyone can see when proofs are generated and whether they're valid, 
                creating an auditable trail without compromising privacy.
              </p>
            </div>

            <div>
              <div className="text-4xl mb-3">🔐</div>
              <h4 className="font-bold mb-2">Zero-Knowledge</h4>
              <p className="text-sm text-gray-400">
                Verification happens without revealing the underlying data. 
                You prove statements are true without showing why they're true.
              </p>
            </div>

            <div>
              <div className="text-4xl mb-3">👤</div>
              <h4 className="font-bold mb-2">Personal Control</h4>
              <p className="text-sm text-gray-400">
                Only you can see the full details of your own proofs, including 
                thresholds and specific verification parameters.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProofDashboard;
