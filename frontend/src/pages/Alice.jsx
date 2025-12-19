import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Home, Eye, List, Check, X, 
  Shield, AlertCircle, Loader, ChevronRight 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import TransactionLog from '../components/TransactionLog';

const Alice = () => {
  const { currentUser, getCurrentAccountId, accounts, connectWallet, addTransaction } = useApp();
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State for each step
  const [ownershipProof, setOwnershipProof] = useState(null);
  const [propertyData, setPropertyData] = useState({
    title: 'Luxury Penthouse Bangkok',
    location: 'Sukhumvit, Bangkok, Thailand',
    price: 15000000,
    propertyType: 'residential',
    description: '5-bedroom penthouse with panoramic city views',
    features: ['Pool', 'Gym', '24/7 Security', 'Smart Home'],
  });
  const [mintedProperty, setMintedProperty] = useState(null);
  const [myProperties, setMyProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [listingData, setListingData] = useState({
    requiresAccreditation: true,
    accreditationThreshold: 1000000,
    requiresJurisdiction: true,
    restrictedCountries: ['US', 'KP', 'IR'],
  });
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [settlementReady, setSettlementReady] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Auto-connect as Alice if not connected
  useEffect(() => {
    if (!currentUser) {
      connectWallet('alice');
    } else if (currentUser !== 'alice') {
      toast.error('Please connect as Alice to access seller features');
    }
  }, [currentUser]);

  // Load Alice's properties
  useEffect(() => {
    if (currentUser === 'alice' && accounts) {
      loadMyProperties();
    }
  }, [currentUser, accounts]);

  const loadMyProperties = async () => {
    try {
      const accountId = getCurrentAccountId();
      const data = await api.getMyProperties(accountId);
      setMyProperties(data.properties || []);
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  // Step 2: Generate Ownership Proof
  const generateOwnershipProof = async () => {
    setLoading(true);
    try {
      const propertyId = `PROP-BURJ-KHALIFA-${Date.now().toString().slice(-3)}`;
      const data = await api.generateOwnershipProof(propertyId, 'alice');
      
      setOwnershipProof(data.proof);
      
      addTransaction({
        title: 'Ownership Proof Generated',
        description: 'Platform verified Alice\'s ownership documents',
        status: 'success',
        timestamp: new Date().toISOString(),
        proofId: data.proof.proofId,
        data: data.proof,
      });

      toast.success('✅ Ownership proof generated and verified!');
      setActiveStep(3);
    } catch (error) {
      toast.error('Failed to generate ownership proof');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Mint Property
  const mintProperty = async () => {
    if (!ownershipProof) {
      toast.error('Please generate ownership proof first');
      return;
    }

    setLoading(true);
    try {
      const accountId = getCurrentAccountId();
      const data = await api.mintProperty({
        ...propertyData,
        ownerAccountId: accountId,
      });

      setMintedProperty(data.property);
      
      addTransaction({
        title: 'Property Minted on Miden',
        description: 'Property encrypted and minted as private note',
        status: 'success',
        timestamp: new Date().toISOString(),
        propertyId: data.property.id,
        noteId: data.property.noteId,
        transactionId: data.property.transactionId,
        ipfsCid: data.property.ipfsCid,
        amount: data.property.price,
        data: {
          blockchain: data.blockchain,
          ipfs: data.ipfs,
          encryption: data.encryption,
        },
      });

      toast.success('🎉 Property minted successfully!');
      await loadMyProperties();
      setActiveStep(4);
    } catch (error) {
      toast.error('Failed to mint property');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: View Properties (automatically loaded)
  const viewPropertyDetails = (property) => {
    setSelectedProperty(property);
    toast.success('Viewing your encrypted property');
  };

  // Step 5: List Property
  const listProperty = async () => {
    if (!selectedProperty) {
      toast.error('Please select a property to list');
      return;
    }

    setLoading(true);
    try {
      const data = await api.listProperty({
        propertyId: selectedProperty.propertyId,
        price: selectedProperty.price,
        ...listingData,
      });

      addTransaction({
        title: 'Property Listed',
        description: 'Property listed with selective disclosure rules',
        status: 'success',
        timestamp: new Date().toISOString(),
        propertyId: data.property.propertyId,
        amount: data.property.price,
        data: listingData,
      });

      toast.success('✅ Property listed successfully!');
      await loadMyProperties();
      setActiveStep(12); // Jump to offer management
    } catch (error) {
      toast.error('Failed to list property');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 12: Load Offers
  const loadOffers = async (propertyId) => {
    setLoading(true);
    try {
      const data = await api.getPropertyOffers(propertyId);
      setOffers(data.offers || []);
      
      if (data.offers && data.offers.length > 0) {
        toast.success(`Found ${data.offers.length} offer(s)`);
      } else {
        toast('No offers yet', { icon: '⏳' });
      }
    } catch (error) {
      toast.error('Failed to load offers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 12: Accept Offer
  const acceptOffer = async (offerId) => {
    setLoading(true);
    try {
      const data = await api.acceptOffer(offerId);

      addTransaction({
        title: 'Offer Accepted',
        description: 'Escrow created and funded',
        status: 'success',
        timestamp: new Date().toISOString(),
        propertyId: data.offer.propertyId,
        transactionId: data.escrow.fundingTx,
        amount: data.escrow.amount,
        data: {
          offer: data.offer,
          escrow: data.escrow,
        },
      });

      toast.success('✅ Offer accepted! Escrow created.');
      setSelectedOffer(data.offer);
      setActiveStep(13);
    } catch (error) {
      toast.error('Failed to accept offer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 13: Check Settlement Ready
  const checkSettlement = async () => {
    if (!selectedOffer) {
      toast.error('Please accept an offer first');
      return;
    }

    setLoading(true);
    try {
      const data = await api.checkSettlementReady(selectedOffer.offerId);
      setSettlementReady(data.readyToSettle);

      if (data.readyToSettle) {
        toast.success('✅ All conditions met! Ready for settlement.');
      } else {
        toast.error('Settlement conditions not met yet');
      }
    } catch (error) {
      toast.error('Failed to check settlement status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser !== 'alice') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="glass-panel p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-miden-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect as Alice</h2>
          <p className="text-gray-400 mb-6">
            This page is for property sellers. Please connect your wallet as Alice to continue.
          </p>
          <button onClick={() => connectWallet('alice')} className="btn-primary">
            Connect as Alice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Alice - Property Seller</h1>
              <p className="text-gray-400">Mint, list, and sell your real estate with privacy</p>
            </div>
          </div>
        </motion.div>

        {/* Step Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {[
            { step: 2, label: 'Ownership Proof', icon: Shield },
            { step: 3, label: 'Mint Property', icon: Upload },
            { step: 4, label: 'View Properties', icon: Eye },
            { step: 5, label: 'List Property', icon: List },
            { step: 12, label: 'Manage Offers', icon: Check },
          ].map(({ step, label, icon: Icon }) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`p-4 rounded-xl border-2 transition-all ${
                activeStep === step
                  ? 'border-miden-blue bg-miden-blue/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                activeStep === step ? 'text-miden-blue' : 'text-gray-400'
              }`} />
              <div className={`text-sm ${
                activeStep === step ? 'text-white font-medium' : 'text-gray-400'
              }`}>
                {label}
              </div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 2: Generate Ownership Proof */}
            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">2</div>
                  <div>
                    <h2 className="text-2xl font-bold">Generate Ownership Proof</h2>
                    <p className="text-gray-400">Platform verifies your property documents</p>
                  </div>
                </div>

                {!ownershipProof ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                          The platform will generate a zero-knowledge proof that you own the property 
                          without revealing the actual ownership documents. This proof will be required 
                          to mint your property NFT.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateOwnershipProof}
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Generating Proof...
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          Generate Ownership Proof
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="proof-verified flex items-center gap-2 justify-center text-lg py-4">
                      <Check className="w-6 h-6" />
                      Ownership Proof Verified
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-400">Proof ID</div>
                        <div className="font-mono text-sm mt-1">{ownershipProof.proofId}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Type</div>
                        <div className="text-sm mt-1 capitalize">{ownershipProof.type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Created</div>
                        <div className="text-sm mt-1">
                          {new Date(ownershipProof.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Expires</div>
                        <div className="text-sm mt-1">
                          {new Date(ownershipProof.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveStep(3)}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      Continue to Mint Property
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Mint Property */}
            {activeStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">3</div>
                  <div>
                    <h2 className="text-2xl font-bold">Mint Property as Private Note</h2>
                    <p className="text-gray-400">Upload details and mint on Miden blockchain</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Title</label>
                      <input
                        type="text"
                        value={propertyData.title}
                        onChange={(e) => setPropertyData({ ...propertyData, title: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Property Type</label>
                      <select
                        value={propertyData.propertyType}
                        onChange={(e) => setPropertyData({ ...propertyData, propertyType: e.target.value })}
                        className="input-field"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Location</label>
                    <input
                      type="text"
                      value={propertyData.location}
                      onChange={(e) => setPropertyData({ ...propertyData, location: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Price (USD)</label>
                    <input
                      type="number"
                      value={propertyData.price}
                      onChange={(e) => setPropertyData({ ...propertyData, price: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={propertyData.description}
                      onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                      rows={3}
                      className="input-field"
                    />
                  </div>

                  <button
                    onClick={mintProperty}
                    disabled={loading || !ownershipProof}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Minting on Miden...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Mint Property
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: View Properties */}
            {activeStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">4</div>
                  <div>
                    <h2 className="text-2xl font-bold">Your Properties</h2>
                    <p className="text-gray-400">View encrypted property details</p>
                  </div>
                </div>

                {myProperties.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No properties found. Mint one first!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myProperties.map((property) => (
                      <div
                        key={property.propertyId}
                        className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedProperty?.propertyId === property.propertyId
                            ? 'border-miden-blue bg-miden-blue/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                        onClick={() => viewPropertyDetails(property)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold">{property.metadata.title}</h3>
                            <p className="text-gray-400 text-sm">{property.metadata.address}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            property.status === 'listed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {property.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Price</div>
                            <div className="font-bold text-miden-gold">
                              ${property.price.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Type</div>
                            <div className="capitalize">{property.metadata.propertyType}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Note ID</div>
                            <div className="font-mono text-xs truncate">{property.midenNoteId}</div>
                          </div>
                        </div>

                        {selectedProperty?.propertyId === property.propertyId && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStep(5);
                              }}
                              className="btn-primary w-full"
                            >
                              List This Property
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: List Property */}
            {activeStep === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">5</div>
                  <div>
                    <h2 className="text-2xl font-bold">List Property for Sale</h2>
                    <p className="text-gray-400">Set selective disclosure rules</p>
                  </div>
                </div>

                {!selectedProperty ? (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Please select a property from the View Properties step first</p>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="btn-secondary mt-4"
                    >
                      Go to Properties
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-bold mb-2">{selectedProperty.metadata.title}</h3>
                      <div className="text-2xl font-bold text-miden-gold">
                        ${selectedProperty.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <div className="font-medium">Require Accreditation Proof</div>
                          <div className="text-sm text-gray-400">Investors must prove net worth</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={listingData.requiresAccreditation}
                          onChange={(e) => setListingData({ 
                            ...listingData, 
                            requiresAccreditation: e.target.checked 
                          })}
                          className="w-5 h-5"
                        />
                      </div>

                      {listingData.requiresAccreditation && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">
                            Minimum Net Worth (USD)
                          </label>
                          <input
                            type="number"
                            value={listingData.accreditationThreshold}
                            onChange={(e) => setListingData({ 
                              ...listingData, 
                              accreditationThreshold: parseInt(e.target.value) 
                            })}
                            className="input-field"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <div className="font-medium">Require Jurisdiction Proof</div>
                          <div className="text-sm text-gray-400">Restrict certain countries</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={listingData.requiresJurisdiction}
                          onChange={(e) => setListingData({ 
                            ...listingData, 
                            requiresJurisdiction: e.target.checked 
                          })}
                          className="w-5 h-5"
                        />
                      </div>

                      <button
                        onClick={listProperty}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Listing...
                          </>
                        ) : (
                          <>
                            <List className="w-5 h-5" />
                            List Property
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 12: Manage Offers */}
            {activeStep === 12 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">12</div>
                  <div>
                    <h2 className="text-2xl font-bold">Manage Offers</h2>
                    <p className="text-gray-400">Review and accept purchase offers</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Select Listed Property</label>
                    <select
                      className="input-field"
                      onChange={(e) => {
                        const property = myProperties.find(p => p.propertyId === e.target.value);
                        setSelectedProperty(property);
                        if (property) loadOffers(property.propertyId);
                      }}
                    >
                      <option value="">Choose a property...</option>
                      {myProperties.filter(p => p.status === 'listed').map(property => (
                        <option key={property.propertyId} value={property.propertyId}>
                          {property.metadata.title} - ${property.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {offers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No offers yet for this property</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {offers.map((offer) => (
                        <div
                          key={offer.offerId}
                          className="p-6 rounded-xl border border-white/10 bg-white/5"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="text-sm text-gray-400">Offer ID</div>
                              <div className="font-mono text-sm">{offer.offerId}</div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              offer.status === 'pending' 
                                ? 'bg-yellow-500/20 text-yellow-400' 
                                : offer.status === 'accepted'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {offer.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm text-gray-400">Offer Price</div>
                              <div className="text-2xl font-bold text-miden-gold">
                                ${offer.offerPrice.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Buyer</div>
                              <div className="font-mono text-xs truncate">
                                {offer.buyerAccountId}
                              </div>
                            </div>
                          </div>

                          {offer.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => acceptOffer(offer.offerId)}
                                disabled={loading}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                              >
                                {loading ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Accept Offer
                                  </>
                                )}
                              </button>
                              <button className="btn-secondary flex items-center gap-2">
                                <X className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          )}

                          {offer.status === 'accepted' && (
                            <button
                              onClick={() => {
                                setSelectedOffer(offer);
                                checkSettlement();
                              }}
                              className="btn-primary w-full"
                            >
                              Check Settlement Status
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Transaction Log Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-4">Transaction Log</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((tx, i) => (
                    <TransactionLog key={i} transaction={tx} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alice;
