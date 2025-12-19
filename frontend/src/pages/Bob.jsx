import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Shield, MapPin, FileText, DollarSign,
  CheckCircle, Loader, ChevronRight, AlertCircle, Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import TransactionLog from '../components/TransactionLog';

const Bob = () => {
  const { currentUser, getCurrentAccountId, accounts, connectWallet, addTransaction } = useApp();
  const [activeStep, setActiveStep] = useState(7);
  const [loading, setLoading] = useState(false);
  
  const [listings, setListings] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [accreditationProof, setAccreditationProof] = useState(null);
  const [jurisdictionProof, setJurisdictionProof] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [offerData, setOfferData] = useState({
    offerPrice: 15000000,
    message: '',
  });
  const [createdOffer, setCreatedOffer] = useState(null);
  const [settlementReady, setSettlementReady] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      connectWallet('bob');
    } else if (currentUser !== 'bob') {
      toast.error('Please connect as Bob to access buyer features');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser === 'bob') {
      loadListings();
    }
  }, [currentUser]);

  const loadListings = async () => {
    try {
      const data = await api.getAvailableListings();
      setListings(data.properties || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    }
  };

  const generateAccreditationProof = async () => {
    setLoading(true);
    try {
      const data = await api.generateAccreditationProof(2500000, 1000000, 'bob');
      setAccreditationProof(data.proof);
      
      addTransaction({
        title: 'Accreditation Proof Generated',
        description: 'ZK proof generated without revealing financial details',
        status: 'success',
        timestamp: new Date().toISOString(),
        proofId: data.proof.type,
        data: data.proof,
      });

      toast.success('✅ Accreditation proof generated!');
      setActiveStep(9);
    } catch (error) {
      toast.error('Failed to generate accreditation proof');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateJurisdictionProof = async () => {
    setLoading(true);
    try {
      const data = await api.generateJurisdictionProof('UK', ['US', 'KP', 'IR'], 'bob');
      setJurisdictionProof(data.proof);
      
      addTransaction({
        title: 'Jurisdiction Proof Generated',
        description: 'ZK proof generated without revealing identity',
        status: 'success',
        timestamp: new Date().toISOString(),
        proofId: data.proof.type,
        data: data.proof,
      });

      toast.success('✅ Jurisdiction proof generated!');
      setActiveStep(10);
    } catch (error) {
      toast.error('Failed to generate jurisdiction proof');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const unlockPropertyDetails = async () => {
    if (!selectedProperty || !accreditationProof || !jurisdictionProof) {
      toast.error('Please generate all required proofs first');
      return;
    }

    setLoading(true);
    try {
      const data = await api.getPropertyDetails(selectedProperty.propertyId, 'bob');
      setPropertyDetails(data.property);
      
      toast.success('✅ Property details unlocked!');
      setActiveStep(11);
    } catch (error) {
      toast.error('Failed to unlock property details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!selectedProperty) return;

    try {
      const data = await api.checkOfferEligibility(selectedProperty.propertyId, 'bob');
      if (data.eligibility.canMakeOffer) {
        toast.success('✅ Eligible to make offer!');
      } else {
        toast.error('Missing requirements: ' + data.eligibility.missingProofs.join(', '));
      }
    } catch (error) {
      toast.error('Failed to check eligibility');
    }
  };

  const submitOffer = async () => {
    if (!propertyDetails) {
      toast.error('Please unlock property details first');
      return;
    }

    setLoading(true);
    try {
      const accountId = getCurrentAccountId();
      const data = await api.createOffer({
        propertyId: propertyDetails.propertyId,
        buyerAccountId: accountId,
        sellerAccountId: accounts.alice_account.id,
        offerPrice: offerData.offerPrice,
        userIdentifier: 'bob',
        message: offerData.message,
      });

      setCreatedOffer(data.offer);
      
      addTransaction({
        title: 'Purchase Offer Submitted',
        description: 'Offer created with compliance verification',
        status: 'success',
        timestamp: new Date().toISOString(),
        propertyId: data.offer.propertyId,
        amount: data.offer.offerPrice,
        data: {
          offer: data.offer,
          compliance: data.compliance,
        },
      });

      toast.success('✅ Offer submitted successfully!');
      setActiveStep(14);
    } catch (error) {
      toast.error('Failed to submit offer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkSettlement = async () => {
    if (!createdOffer) {
      toast.error('Please submit an offer first');
      return;
    }

    setLoading(true);
    try {
      const data = await api.checkSettlementReady(createdOffer.offerId);
      setSettlementReady(data.readyToSettle);

      if (data.readyToSettle) {
        toast.success('✅ Ready for settlement!');
      } else {
        toast('Waiting for seller approval...', { icon: '⏳' });
      }
    } catch (error) {
      toast.error('Failed to check settlement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser !== 'bob') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="glass-panel p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-miden-cyan mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect as Bob</h2>
          <p className="text-gray-400 mb-6">
            This page is for property buyers. Please connect your wallet as Bob to continue.
          </p>
          <button onClick={() => connectWallet('bob')} className="btn-primary">
            Connect as Bob
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bob - Property Buyer</h1>
              <p className="text-gray-400">Browse, verify, and purchase real estate privately</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {[
            { step: 7, label: 'Browse Listings', icon: Search },
            { step: 8, label: 'Accreditation', icon: Shield },
            { step: 9, label: 'Jurisdiction', icon: MapPin },
            { step: 10, label: 'Unlock Details', icon: Eye },
            { step: 11, label: 'Make Offer', icon: DollarSign },
          ].map(({ step, label, icon: Icon }) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`p-4 rounded-xl border-2 transition-all ${
                activeStep === step
                  ? 'border-miden-cyan bg-miden-cyan/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                activeStep === step ? 'text-miden-cyan' : 'text-gray-400'
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
          <div className="lg:col-span-2 space-y-6">
            {activeStep === 7 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">7</div>
                  <div>
                    <h2 className="text-2xl font-bold">Available Listings</h2>
                    <p className="text-gray-400">Browse anonymized properties</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {listings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No properties listed yet</p>
                    </div>
                  ) : (
                    listings.map((property) => (
                      <div
                        key={property.propertyId}
                        className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedProperty?.propertyId === property.propertyId
                            ? 'border-miden-cyan bg-miden-cyan/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                        onClick={() => {
                          setSelectedProperty(property);
                          toast.success('Property selected');
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold">{property.title}</h3>
                            <p className="text-gray-400 text-sm">{property.description}</p>
                          </div>
                          {property.locked && (
                            <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              🔒 Locked
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Price</div>
                            <div className="font-bold text-miden-gold text-xl">
                              ${property.price.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Type</div>
                            <div className="capitalize">{property.propertyType}</div>
                          </div>
                        </div>

                        {selectedProperty?.propertyId === property.propertyId && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStep(8);
                              }}
                              className="btn-primary w-full"
                            >
                              Generate Proofs to Unlock
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeStep === 8 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">8</div>
                  <div>
                    <h2 className="text-2xl font-bold">Generate Accreditation Proof</h2>
                    <p className="text-gray-400">Prove net worth without revealing amount</p>
                  </div>
                </div>

                {!accreditationProof ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                          Generate a zero-knowledge proof that your net worth exceeds $1,000,000 
                          without revealing your actual financial details. This proof is client-side only.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateAccreditationProof}
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><Loader className="w-5 h-5 animate-spin" />Generating Proof...</>
                      ) : (
                        <><Shield className="w-5 h-5" />Generate Accreditation Proof</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="proof-verified flex items-center gap-2 justify-center text-lg py-4">
                      <CheckCircle className="w-6 h-6" />
                      Accreditation Verified
                    </div>
                    <button onClick={() => setActiveStep(9)} className="btn-primary w-full">
                      Continue to Jurisdiction Proof<ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeStep === 9 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">9</div>
                  <div>
                    <h2 className="text-2xl font-bold">Generate Jurisdiction Proof</h2>
                    <p className="text-gray-400">Prove eligibility without revealing identity</p>
                  </div>
                </div>

                {!jurisdictionProof ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                          Prove you're not from a restricted jurisdiction (US, KP, IR) without 
                          revealing your identity or exact location.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateJurisdictionProof}
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><Loader className="w-5 h-5 animate-spin" />Generating Proof...</>
                      ) : (
                        <><MapPin className="w-5 h-5" />Generate Jurisdiction Proof</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="proof-verified flex items-center gap-2 justify-center text-lg py-4">
                      <CheckCircle className="w-6 h-6" />
                      Jurisdiction Verified
                    </div>
                    <button onClick={unlockPropertyDetails} disabled={loading} className="btn-primary w-full">
                      {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Unlock Property Details'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeStep === 10 && propertyDetails && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-complete">10</div>
                  <div>
                    <h2 className="text-2xl font-bold">Property Details Unlocked</h2>
                    <p className="text-gray-400">Full access granted with verified proofs</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-2">{propertyDetails.title}</h3>
                    <p className="text-gray-400 mb-4">{propertyDetails.description}</p>
                    <div className="text-3xl font-bold text-miden-gold">${propertyDetails.price.toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Address</div>
                      <div>{propertyDetails.address}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Type</div>
                      <div className="capitalize">{propertyDetails.propertyType}</div>
                    </div>
                  </div>

                  {propertyDetails.features && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">Features</div>
                      <div className="flex flex-wrap gap-2">
                        {propertyDetails.features.map((feature, i) => (
                          <span key={i} className="px-3 py-1 bg-miden-blue/20 text-miden-blue rounded-full text-sm">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setActiveStep(11)} className="btn-primary w-full">
                    Make Purchase Offer<ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {activeStep === 11 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">11</div>
                  <div>
                    <h2 className="text-2xl font-bold">Submit Purchase Offer</h2>
                    <p className="text-gray-400">Make your offer with locked escrow</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Offer Price (USD)</label>
                    <input
                      type="number"
                      value={offerData.offerPrice}
                      onChange={(e) => setOfferData({ ...offerData, offerPrice: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Message to Seller</label>
                    <textarea
                      value={offerData.message}
                      onChange={(e) => setOfferData({ ...offerData, message: e.target.value })}
                      rows={3}
                      className="input-field"
                      placeholder="Optional message..."
                    />
                  </div>

                  <button onClick={checkEligibility} className="btn-secondary w-full">Check Eligibility</button>

                  <button
                    onClick={submitOffer}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader className="w-5 h-5 animate-spin" />Submitting...</>
                    ) : (
                      <><DollarSign className="w-5 h-5" />Submit Offer</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {activeStep === 14 && createdOffer && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="step-active">14</div>
                  <div>
                    <h2 className="text-2xl font-bold">Confirm Settlement</h2>
                    <p className="text-gray-400">Check if ready for atomic settlement</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="text-sm text-gray-400">Offer Status</div>
                    <div className="text-xl font-bold capitalize">{createdOffer.status}</div>
                  </div>

                  <button
                    onClick={checkSettlement}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Check Settlement Status'}
                  </button>

                  {settlementReady && (
                    <div className="proof-verified flex items-center gap-2 justify-center text-lg py-4">
                      <CheckCircle className="w-6 h-6" />
                      Ready for Settlement!
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

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
                  transactions.map((tx, i) => <TransactionLog key={i} transaction={tx} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bob;
