/**
 * Encryption Service - AES-256-GCM
 * Handles encryption/decryption of property metadata
 * Keys are stored per-property and shared after proof verification
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
  }

  /**
   * Generate a random encryption key
   * @returns {string} Base64 encoded key
   */
  generateKey() {
    const key = crypto.randomBytes(this.keyLength);
    return key.toString('base64');
  }

  /**
   * Encrypt property metadata
   * @param {object} metadata - Property data to encrypt
   * @param {string} keyBase64 - Base64 encoded encryption key (optional)
   * @returns {object} { encryptedData, key, iv, tag }
   */
  encryptMetadata(metadata, keyBase64 = null) {
    try {
      // Generate key if not provided
      const key = keyBase64 
        ? Buffer.from(keyBase64, 'base64')
        : crypto.randomBytes(this.keyLength);

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Convert metadata to JSON string
      const jsonData = JSON.stringify(metadata);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(jsonData, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      console.log('✅ Metadata encrypted successfully');
      console.log(`   Data size: ${jsonData.length} bytes`);
      console.log(`   Encrypted size: ${encrypted.length} bytes`);

      return {
        encryptedData: encrypted,
        key: key.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt property metadata
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} keyBase64 - Base64 encoded encryption key
   * @param {string} ivBase64 - Base64 encoded IV
   * @param {string} tagBase64 - Base64 encoded auth tag
   * @returns {object} Decrypted metadata object
   */
  decryptMetadata(encryptedData, keyBase64, ivBase64, tagBase64) {
    try {
      // Convert from base64
      const key = Buffer.from(keyBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Parse JSON
      const metadata = JSON.parse(decrypted);

      console.log('✅ Metadata decrypted successfully');

      return metadata;
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Create encrypted package for IPFS
   * Includes encrypted data + metadata needed for decryption (except key)
   * @param {object} metadata - Property data
   * @returns {object} Package ready for IPFS upload
   */
  createEncryptedPackage(metadata) {
    const encrypted = this.encryptMetadata(metadata);

    return {
      version: '1.0',
      algorithm: this.algorithm,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      tag: encrypted.tag,
      timestamp: new Date().toISOString(),
      // Key is NOT included in IPFS package - stored separately
      metadata: {
        encrypted: true,
        requiresProofVerification: true
      }
    };
  }

  /**
   * Decrypt package from IPFS
   * @param {object} ipfsPackage - Package from IPFS
   * @param {string} keyBase64 - Decryption key
   * @returns {object} Decrypted metadata
   */
  decryptPackage(ipfsPackage, keyBase64) {
    if (!ipfsPackage.encryptedData) {
      throw new Error('Invalid encrypted package');
    }

    return this.decryptMetadata(
      ipfsPackage.encryptedData,
      keyBase64,
      ipfsPackage.iv,
      ipfsPackage.tag
    );
  }

  /**
   * Hash data for proof generation
   * Used for ownership proofs
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hex hash
   */
  hashData(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Verify data matches hash
   * @param {string} data - Original data
   * @param {string} hash - Expected hash
   * @returns {boolean} True if match
   */
  verifyHash(data, hash) {
    const computedHash = this.hashData(data);
    return computedHash === hash;
  }
}

module.exports = new EncryptionService();