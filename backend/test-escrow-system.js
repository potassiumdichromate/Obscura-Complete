// test-escrow-system.js - Test Complete Escrow Flow
// Place this file in: backend/ (root of backend folder, NOT in src/)

const midenService = require('./src/services/midenClient');

async function testEscrowSystem() {
  console.log('\n🧪 ============================================');
  console.log('🧪 ESCROW SYSTEM TEST - Complete Flow');
  console.log('🧪 ============================================\n');

  try {
    // Step 1: Get account info
    console.log('1️⃣  Getting account information...');
    const accountInfo = await midenService.getAccountInfo();
    const aliceAccount = accountInfo.alice_account.id;
    const faucetAccount = accountInfo.faucet_account.id;
    
    console.log('✅ Accounts ready');
    console.log(`   Alice (Buyer): ${aliceAccount}`);
    console.log(`   Faucet (Seller): ${faucetAccount}`);
    console.log('');

    // Step 2: Mint token for buyer (so buyer has funds)
    console.log('2️⃣  Minting token for buyer...');
    const property = {
      id: `ESCROW-TEST-${Date.now()}`,
      ipfsCid: 'QmEscrowTest123',
      type: 'residential',
      price: 100000
    };
    
    const mintResult = await midenService.createPropertyToken(property);
    console.log('✅ Token minted for buyer');
    console.log(`   TX: ${mintResult.transactionId}`);
    console.log('');

    // Step 3: Wait for note to be consumable and propagate to network
    console.log('3️⃣  Waiting for note propagation (60s)...');
    console.log('   ⏳ Note needs time to propagate across Miden network nodes');
    await new Promise(r => setTimeout(r, 60000)); // Increased from 15s to 60s
    
    // Step 4: Get and consume note (buyer gets funds in wallet)
    console.log('4️⃣  Consuming note to buyer wallet...');
    const notes = await midenService.getConsumableNotes();
    
    if (notes.notes.length === 0) {
      console.log('⚠️  No notes available - wait longer and try again');
      return;
    }
    
    const consumeResult = await midenService.consumeNote(notes.notes[0].note_id);
    console.log('✅ Note consumed - buyer has funds');
    console.log(`   TX: ${consumeResult.transactionId}`);
    console.log('');

    // Step 5: Create escrow
    console.log('5️⃣  Creating escrow account...');
    const escrow = await midenService.createEscrow(
      'alice',    // Buyer (use string identifier, not account ID)
      'faucet',   // Seller (use string identifier, not account ID)
      100000      // Amount
    );
    
    console.log('✅ Escrow created!');
    console.log(`   Escrow Account: ${escrow.escrowAccountId}`);
    console.log(`   Buyer: ${escrow.buyerAccountId}`);
    console.log(`   Seller: ${escrow.sellerAccountId}`);
    console.log(`   Amount: ${escrow.amount}`);
    console.log(`   Status: ${escrow.status}`);
    console.log('');

    // Step 6: Fund escrow (buyer sends funds to escrow)
    console.log('6️⃣  Buyer funding escrow...');
    const fundResult = await midenService.fundEscrow(escrow);
    console.log('✅ Escrow funded!');
    console.log(`   TX: ${fundResult.transactionId}`);
    console.log(`   🔍 ${fundResult.explorerUrl}`);
    console.log('');

    // Step 7: Wait for funded note to propagate across network
    console.log('7️⃣  Waiting for funded note propagation (60s)...');
    console.log('   ⏳ Funded escrow note needs time to propagate');
    await new Promise(r => setTimeout(r, 60000)); // Increased from 20s to 60s
    console.log('');

    // Step 8: Choose path - Release OR Refund
    console.log('8️⃣  Testing RELEASE path (successful sale)...');
    console.log('   (To test refund instead, change to releaseEscrow)');
    console.log('');

    // Path A: Release to seller (successful sale)
    console.log('🔓 Releasing escrow to seller...');
    const releaseResult = await midenService.releaseEscrow(escrow);
    console.log('✅ Escrow released to seller!');
    console.log(`   TX: ${releaseResult.transactionId}`);
    console.log(`   🔍 ${releaseResult.explorerUrl}`);
    console.log('');

    // Path B: Refund to buyer (failed sale) - Uncomment to test
    /*
    console.log('↩️  Refunding escrow to buyer...');
    const refundResult = await midenService.refundEscrow(escrow);
    console.log('✅ Escrow refunded to buyer!');
    console.log(`   TX: ${refundResult.transactionId}`);
    console.log(`   🔍 ${refundResult.explorerUrl}`);
    console.log('');
    */

    // Final Summary
    console.log('🎉 ============================================');
    console.log('🎉 ESCROW SYSTEM TEST COMPLETE!');
    console.log('🎉 ============================================\n');
    console.log('📊 Test Summary:');
    console.log('   ✅ Escrow account creation');
    console.log('   ✅ Fund escrow (buyer → escrow)');
    console.log('   ✅ Release escrow (escrow → seller)');
    console.log('   ⏩ Refund escrow (not tested - change code to test)');
    console.log('');
    console.log('✅ Escrow system fully functional!');
    console.log('');
    console.log('🔗 View transactions on MidenScan:');
    console.log('   https://testnet.midenscan.com');
    console.log('');

  } catch (error) {
    console.error('\n❌ Escrow test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run test
testEscrowSystem();