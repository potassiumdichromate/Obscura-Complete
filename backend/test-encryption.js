// backend/test-encryption.js
const encryptionService = require('./src/services/encryptionService');

const testData = {
  title: "Test Property",
  price: 1000000
};

const encrypted = encryptionService.encryptMetadata(testData);
console.log('Encrypted:', encrypted);

const decrypted = encryptionService.decryptMetadata(
  encrypted.encryptedData,
  encrypted.key,
  encrypted.iv,
  encrypted.tag
);
console.log('Decrypted:', decrypted);