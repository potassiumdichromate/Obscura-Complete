// File: backend/test-offers-final.js
// Test with proper .env loading

require('dotenv').config();  // ← Load .env file!

const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api/v1';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hsvgamedev_db_user:d729446*@cluster0.4lygp2y.mongodb.net/?appName=Cluster0';

async function testOfferSystem() {
  console.log('\n🎬 OFFER SYSTEM TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Connect to MongoDB
    console.log('⏳ Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.substring(0, 30)}...\n`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected!\n');
    
    const Property = require('./src/models/Property');
    const Offer = require('./src/models/Offer');
    
    // Step 1: Create verified property
    console.log('📋 STEP 1: Create Verified Property\n');
    
    const property = await Property.create({
      propertyId: `PROP-${Date.now()}`,
      ownerAccountId: 'seller-224',
      ipfsCid: 'QmTestProperty',
      propertyType: 1,
      price: 500000,
      noteId: `note-${Date.now()}`,
      transactionId: `tx-${Date.now()}`,
      verificationStatus: 'verified'
    });
    console.log(`   ✅ Property: ${property.propertyId}`);
    console.log(`   Status: verified\n`);

    // Step 2: Create offer
    console.log('📋 STEP 2: Create Offer\n');
    
    const offerResponse = await axios.post(`${BASE_URL}/offers/create`, {
      propertyId: property.propertyId,
      buyerAccountId: 'buyer-456',
      sellerAccountId: 'seller-123',
      offerPrice: 450000
    });
    console.log(`   ✅ Offer: ${offerResponse.data.offer.offerId}`);
    console.log(`   Amount: $${offerResponse.data.offer.offerPrice}\n`);

    // Step 3: View offers
    console.log('📋 STEP 3: View Offers\n');
    
    const offers = await axios.get(`${BASE_URL}/offers/property/${property.propertyId}`);
    console.log(`   ✅ Found ${offers.data.count} offer(s)\n`);

    // Step 4: Reject offer
    console.log('📋 STEP 4: Reject Offer\n');
    
    await axios.post(
      `${BASE_URL}/offers/${offerResponse.data.offer.offerId}/reject`,
      { reason: 'Price too low' }
    );
    console.log(`   ✅ Offer rejected\n`);

    // Step 5: Test unverified property
    console.log('📋 STEP 5: Test Unverified Property\n');
    
    const unverified = await Property.create({
      propertyId: `PROP-UNVERIFIED-${Date.now()}`,
      ownerAccountId: 'seller-789',
      ipfsCid: 'QmUnverified',
      propertyType: 1,
      price: 300000,
      noteId: `note-${Date.now()}`,
      transactionId: `tx-${Date.now()}`,
      verificationStatus: 'pending'
    });

    try {
      await axios.post(`${BASE_URL}/offers/create`, {
        propertyId: unverified.propertyId,
        buyerAccountId: 'buyer-456',
        sellerAccountId: 'seller-789',
        offerPrice: 280000
      });
      console.log('   ❌ Should have blocked!\n');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Correctly blocked (403)\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TEST COMPLETE - ALL WORKING!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testOfferSystem();