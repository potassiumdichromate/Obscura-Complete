import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, ArrowRight, Lock, Users, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { id: 1, title: 'Alice connects wallet', role: 'alice', icon: '👤' },
  { id: 2, title: 'Platform verifies Alice ownership proof', role: 'platform', icon: '🔐' },
  { id: 3, title: 'Alice uploads & mints property as private note', role: 'alice', icon: '🏠' },
  { id: 4, title: 'Alice views her encrypted property', role: 'alice', icon: '👁️' },
  { id: 5, title: 'Alice lists property with disclosure rules', role: 'alice', icon: '📋' },
  { id: 6, title: 'Bob connects wallet', role: 'bob', icon: '👤' },
  { id: 7, title: 'Bob views anonymized listings', role: 'bob', icon: '🔍' },
  { id: 8, title: 'Bob generates accreditation ZK proof', role: 'bob', icon: '✅' },
  { id: 9, title: 'Bob generates jurisdiction ZK proof', role: 'bob', icon: '🌍' },
  { id: 10, title: 'Bob unlocks full property details', role: 'bob', icon: '🔓' },
  { id: 11, title: 'Bob submits purchase offer', role: 'bob', icon: '💰' },
  { id: 12, title: 'Alice reviews and accepts offer', role: 'alice', icon: '✅' },
  { id: 13, title: 'Alice confirms settlement readiness', role: 'alice', icon: '📝' },
  { id: 14, title: 'Bob confirms settlement readiness', role: 'bob', icon: '📝' },
  { id: 15, title: 'Platform verifies compliance', role: 'platform', icon: '🔍' },
  { id: 16, title: 'Platform executes atomic settlement', role: 'platform', icon: '⚡' },
  { id: 17, title: 'View proof generation events', role: 'platform', icon: '📊' },
  { id: 18, title: 'View proof verification results', role: 'platform', icon: '✓' },
  { id: 19, title: 'View personal proof history', role: 'all', icon: '📜' },
];

const Home = () => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'alice': return 'from-purple-500 to-pink-500';
      case 'bob': return 'from-blue-500 to-cyan-500';
      case 'platform': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-6">
            <Shield className="w-4 h-4 text-miden-blue" />
            <span className="text-sm text-gray-300">Privacy-Preserving Real Estate on Miden</span>
          </div>
          
          <h1 className="text-6xl font-bold mb-6">
            <span className="gradient-text">OBSCURA</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Experience the complete 19-step journey of tokenizing, trading, and settling real estate 
            transactions with zero-knowledge proofs on Polygon Miden blockchain.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/alice" className="btn-primary flex items-center gap-2">
              Start as Alice (Seller)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/bob" className="btn-secondary flex items-center gap-2">
              Start as Bob (Buyer)
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6"
          >
            <Lock className="w-10 h-10 text-miden-blue mb-4" />
            <h3 className="text-xl font-semibold mb-2">Private by Default</h3>
            <p className="text-gray-400">
              Property details encrypted on-chain. Selective disclosure with ZK proofs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6"
          >
            <CheckCircle className="w-10 h-10 text-miden-cyan mb-4" />
            <h3 className="text-xl font-semibold mb-2">Compliance Built-In</h3>
            <p className="text-gray-400">
              Prove accreditation and jurisdiction without revealing identity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-6"
          >
            <FileText className="w-10 h-10 text-miden-purple mb-4" />
            <h3 className="text-xl font-semibold mb-2">Atomic Settlement</h3>
            <p className="text-gray-400">
              Simultaneous ownership transfer and fund release on Miden.
            </p>
          </motion.div>
        </div>

        {/* Complete 19-Step Journey */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            Complete <span className="gradient-text">19-Step Journey</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="glass-panel p-5 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(step.role)} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">Step {step.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getRoleColor(step.role)} bg-opacity-20`}>
                        {step.role === 'all' ? 'Anyone' : step.role.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-white group-hover:text-miden-blue transition-colors">
                      {step.title}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 glass-panel p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Powered By</h3>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">Polygon Miden</div>
              <div className="text-sm text-gray-400">ZK-Rollup Blockchain</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-miden-cyan">IPFS</div>
              <div className="text-sm text-gray-400">Decentralized Storage</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-miden-purple">AES-256-GCM</div>
              <div className="text-sm text-gray-400">Client-Side Encryption</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
