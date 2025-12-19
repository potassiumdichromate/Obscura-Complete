// backend/test-ipfs.js
require('dotenv').config();



const ipfsService = require('./src/services/ipfsService');

async function test() {
  // Test connection
  const status = await ipfsService.testConnection();
  console.log('Connection:', status);

  // Test upload
  const result = await ipfsService.uploadJSON({
    test: 'data',
    timestamp: new Date().toISOString()
  }, 'test-upload');
  
  console.log('Upload result:', result);
  console.log('CID:', result.cid);
  console.log('URL:', result.url);

  // Test retrieval
  if (!result.mock) {
    const retrieved = await ipfsService.retrieve(result.cid);
    console.log('Retrieved:', retrieved);
  }
}

test().catch(console.error);