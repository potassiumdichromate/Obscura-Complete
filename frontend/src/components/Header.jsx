import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Wallet, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

const Header = () => {
  const { currentUser, accounts, connectWallet, disconnectWallet } = useApp();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getCurrentAccountId = () => {
    if (!currentUser || !accounts) return null;
    return currentUser === 'alice' 
      ? accounts.alice_account.id 
      : accounts.bob_account.id;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="w-10 h-10 bg-gradient-to-br from-miden-blue to-miden-purple rounded-xl flex items-center justify-center"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold gradient-text">OBSCURA</h1>
              <p className="text-xs text-gray-400">Every Frame Matters</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg transition-all ${
                isActive('/') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>
            <Link
              to="/alice"
              className={`px-4 py-2 rounded-lg transition-all ${
                isActive('/alice') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Alice (Seller)
            </Link>
            <Link
              to="/bob"
              className={`px-4 py-2 rounded-lg transition-all ${
                isActive('/bob') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Bob (Buyer)
            </Link>
            <Link
              to="/platform"
              className={`px-4 py-2 rounded-lg transition-all ${
                isActive('/platform') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Platform
            </Link>
            <Link
              to="/proofs"
              className={`px-4 py-2 rounded-lg transition-all ${
                isActive('/proofs') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Proof Dashboard
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {!currentUser ? (
              <div className="flex gap-2">
                <button
                  onClick={() => connectWallet('alice')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Connect as Alice
                </button>
                <button
                  onClick={() => connectWallet('bob')}
                  className="btn-primary flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Connect as Bob
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="glass-panel px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-miden-blue" />
                    <div>
                      <div className="text-xs text-gray-400 uppercase">{currentUser}</div>
                      <div className="text-sm font-mono text-white">
                        {truncateAddress(getCurrentAccountId())}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <LogOut className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
