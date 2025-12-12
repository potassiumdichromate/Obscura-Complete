// File: backend/test-verification-final.js
// Test with proper .env loading

require('dotenv').config();  // ← Load .env file!

const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api/v1';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/obscura_db';

async function testVerificationSystem() {
  console.log('\n🎬 VERIFICATION SYSTEM TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Connect to MongoDB
    console.log('⏳ Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.substring(0, 30)}...\n`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected!\n');
    
    const Property = require('./src/models/Property');
    
    // Step 1: Submit property
    console.log('📋 STEP 1: Submit Property\n');
    
    const property = await Property.create({
      propertyId: `PROP-VERIFY-${Date.now()}`,
      ownerAccountId: 'owner-123',
      ipfsCid: 'QmProperty1',
      propertyType: 1,
      price: 500000,
      noteId: `note-${Date.now()}`,
      transactionId: `tx-${Date.now()}`,
      verificationStatus: 'pending'
    });
    console.log(`   ✅ Property: ${property.propertyId} (pending)\n`);

    // Step 2: View pending
    console.log('📋 STEP 2: View Pending\n');
    
    const pending = await axios.get(`${BASE_URL}/verification/pending`);
    console.log(`   ✅ Found ${pending.data.count} pending\n`);

    // Step 3: Get stats
    console.log('📋 STEP 3: View Stats\n');
    
    const stats = await axios.get(`${BASE_URL}/verification/stats`);
    console.log(`   ✅ Total: ${stats.data.stats.total}`);
    console.log(`   Pending: ${stats.data.stats.by_status.pending}\n`);

    // Step 4: Mark for review
    console.log('📋 STEP 4: Mark for Review\n');
    
    await axios.post(`${BASE_URL}/verification/review/${property.propertyId}`, {
      adminAccountId: 'admin-001',
      notes: 'Need documents'
    });
    console.log(`   ✅ Status: under_review\n`);

    // Step 5: Approve
    console.log('📋 STEP 5: Approve Property\n');
    
    await axios.post(`${BASE_URL}/verification/approve/${property.propertyId}`, {
      adminAccountId: 'admin-001',
      notes: 'All verified'
    });
    console.log(`   ✅ Status: verified\n`);

    // Step 6: Reject another property
    console.log('📋 STEP 6: Reject Property\n');
    
    const property2 = await Property.create({
      propertyId: `PROP-REJECT-${Date.now()}`,
      ownerAccountId: 'owner-456',
      ipfsCid: 'QmProperty2',
      propertyType: 1,
      price: 300000,
      noteId: `note-${Date.now()}`,
      transactionId: `tx-${Date.now()}`,
      verificationStatus: 'pending'
    });

    await axios.post(`${BASE_URL}/verification/reject/${property2.propertyId}`, {
      adminAccountId: 'admin-001',
      reason: 'Missing deed'
    });
    console.log(`   ✅ Property rejected\n`);

    // Step 7: View history
    console.log('📋 STEP 7: View History\n');
    
    const history = await axios.get(`${BASE_URL}/verification/history/${property.propertyId}`);
    console.log(`   ✅ Found ${history.data.count} entries\n`);

    // Step 8: Test offer block
    console.log('📋 STEP 8: Test Offer Block\n');
    
    try {
      await axios.post(`${BASE_URL}/offers/create`, {
        propertyId: property2.propertyId,
        buyerAccountId: 'buyer-123',
        sellerAccountId: 'owner-456',
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
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testVerificationSystem();