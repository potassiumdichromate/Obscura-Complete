import axios from 'axios';

const RUST_API = 'http://localhost:3000';
const NODE_API = 'http://localhost:5000/api/v1';

// Create axios instances
const rustClient = axios.create({
  baseURL: RUST_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

const nodeClient = axios.create({
  baseURL: NODE_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptors for logging
rustClient.interceptors.response.use(
  (response) => {
    console.log('✅ Rust API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Rust API Error:', error.response?.data || error.message);
    throw error;
  }
);

nodeClient.interceptors.response.use(
  (response) => {
    console.log('✅ Node API Response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Node API Error:', error.response?.data || error.message);
    throw error;
  }
);

// API Methods
export const api = {
  // Step 1 & 6: Get Accounts
  getAccounts: async () => {
    const { data } = await rustClient.get('/get-account');
    return data;
  },

  // Step 2: Generate Ownership Proof
  generateOwnershipProof: async (propertyId, userIdentifier) => {
    const { data } = await nodeClient.post('/proofs/generate-ownership', {
      propertyId,
      userIdentifier,
    });
    return data;
  },

  // Step 3: Mint Property
  mintProperty: async (propertyData) => {
    const { data } = await nodeClient.post('/properties/mint-encrypted', propertyData);
    return data;
  },

  // Step 4: Get My Properties
  getMyProperties: async (userIdentifier) => {
    const { data } = await nodeClient.get(`/properties/my-properties?userIdentifier=${userIdentifier}`);
    return data;
  },

  // Step 5: List Property
  listProperty: async (listingData) => {
    const { data } = await nodeClient.post('/properties/list', listingData);
    return data;
  },

  // Step 7: Get Available Listings
  getAvailableListings: async () => {
    const { data } = await nodeClient.get('/properties/available');
    return data;
  },

  // Step 8: Generate Accreditation Proof
  generateAccreditationProof: async (netWorth, threshold, userIdentifier) => {
    const { data } = await nodeClient.post('/proofs/generate-accreditation', {
      netWorth,
      threshold,
      userIdentifier,
    });
    return data;
  },

  // Step 9: Generate Jurisdiction Proof
  generateJurisdictionProof: async (countryCode, restrictedCountries, userIdentifier) => {
    const { data } = await nodeClient.post('/proofs/generate-jurisdiction', {
      countryCode,
      restrictedCountries,
      userIdentifier,
    });
    return data;
  },

  // Step 10: Get Property Details
  getPropertyDetails: async (propertyId, userIdentifier) => {
    const { data } = await nodeClient.get(`/properties/${propertyId}/details?userIdentifier=${userIdentifier}`);
    return data;
  },

  // Step 11: Check Offer Eligibility
  checkOfferEligibility: async (propertyId, userIdentifier) => {
    const { data } = await nodeClient.get(`/offers/check-eligibility?propertyId=${propertyId}&userIdentifier=${userIdentifier}`);
    return data;
  },

  // Step 11: Create Offer
  createOffer: async (offerData) => {
    const { data } = await nodeClient.post('/offers/create', offerData);
    return data;
  },

  // Step 12: Get Property Offers
  getPropertyOffers: async (propertyId) => {
    const { data } = await nodeClient.get(`/offers/property/${propertyId}`);
    return data;
  },

  // Step 12: Accept Offer
  acceptOffer: async (offerId) => {
    const { data } = await nodeClient.post(`/offers/${offerId}/accept`);
    return data;
  },

  // Step 13-15: Check Settlement Ready
  checkSettlementReady: async (offerId) => {
    const { data } = await nodeClient.get(`/settlement/${offerId}/check-ready`);
    return data;
  },

  // Step 16: Execute Settlement
  executeSettlement: async (offerId) => {
    const { data } = await nodeClient.post(`/settlement/${offerId}/execute`);
    return data;
  },

  // Step 19: Get My Proofs
  getMyProofs: async (userIdentifier) => {
    const { data } = await nodeClient.get(`/proofs/my-proofs?userIdentifier=${userIdentifier}`);
    return data;
  },

  // Get All Proofs (for public dashboard)
  getAllProofs: async () => {
    const { data } = await nodeClient.get('/proofs/all');
    return data;
  },
};

export default api;
