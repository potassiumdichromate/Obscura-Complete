import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // 'alice' or 'bob'
  const [accounts, setAccounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aliceProperties, setAliceProperties] = useState([]);
  const [bobProofs, setBobProofs] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data.data);
      console.log('🔐 Accounts loaded:', data.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Failed to connect to Miden network');
    }
  };

  const connectWallet = (user) => {
    setCurrentUser(user);
    toast.success(`Connected as ${user.toUpperCase()} ✅`);
  };

  const disconnectWallet = () => {
    setCurrentUser(null);
    toast.success('Disconnected wallet');
  };

  const addTransaction = (tx) => {
    setTransactions((prev) => [tx, ...prev]);
  };

  const getCurrentAccountId = () => {
    if (!currentUser || !accounts) return null;
    return currentUser === 'alice' 
      ? accounts.alice_account.id 
      : accounts.bob_account.id;
  };

  const value = {
    currentUser,
    accounts,
    loading,
    setLoading,
    connectWallet,
    disconnectWallet,
    getCurrentAccountId,
    aliceProperties,
    setAliceProperties,
    bobProofs,
    setBobProofs,
    transactions,
    addTransaction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
