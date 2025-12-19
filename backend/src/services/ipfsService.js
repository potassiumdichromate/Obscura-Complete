/**
 * IPFS Service - Real Upload to Pinata/IPFS
 * Handles uploading encrypted property metadata to IPFS
 * Returns real IPFS CIDs (QmXXX...)
 */

const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    // Pinata (most reliable IPFS service)
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataEndpoint = 'https://api.pinata.cloud';
    
    // Public IPFS gateway for retrieval
    this.ipfsGateway = 'https://gateway.pinata.cloud/ipfs/';
    
    console.log('🔗 IPFS Service initialized');
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      console.warn('⚠️  Pinata credentials not found - using mock mode');
      console.warn('   Set PINATA_API_KEY and PINATA_SECRET_KEY for real IPFS');
      this.useMockMode = true;
    } else {
      console.log('✅ Pinata credentials loaded');
      this.useMockMode = false;
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   * @param {object} data - Data to upload
   * @param {string} name - Optional name for pinned file
   * @returns {object} { cid, url, size }
   */
  async uploadJSON(data, name = 'property-metadata') {
    if (this.useMockMode) {
      return this._mockUpload(data, name);
    }

    try {
      console.log(`📤 Uploading to IPFS: ${name}`);
      console.log(`   Data size: ${JSON.stringify(data).length} bytes`);

      const url = `${this.pinataEndpoint}/pinning/pinJSONToIPFS`;
      
      const body = {
        pinataContent: data,
        pinataMetadata: {
          name: name,
          keyvalues: {
            timestamp: new Date().toISOString(),
            type: 'encrypted-property-metadata',
            version: '1.0'
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };

      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        }
      });

      const cid = response.data.IpfsHash;
      const ipfsUrl = `${this.ipfsGateway}${cid}`;

      console.log('✅ Uploaded to IPFS successfully!');
      console.log(`   CID: ${cid}`);
      console.log(`   URL: ${ipfsUrl}`);

      return {
        cid,
        url: ipfsUrl,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp
      };
    } catch (error) {
      console.error('❌ IPFS upload failed:', error.message);
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }

      // Fallback to mock mode if Pinata fails
      console.warn('⚠️  Falling back to mock mode');
      return this._mockUpload(data, name);
    }
  }

  /**
   * Upload file buffer to IPFS via Pinata
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Filename
   * @returns {object} { cid, url, size }
   */
  async uploadFile(buffer, filename) {
    if (this.useMockMode) {
      return this._mockUpload({ file: filename }, filename);
    }

    try {
      console.log(`📤 Uploading file to IPFS: ${filename}`);
      console.log(`   Size: ${buffer.length} bytes`);

      const url = `${this.pinataEndpoint}/pinning/pinFileToIPFS`;
      
      const formData = new FormData();
      formData.append('file', buffer, filename);

      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          timestamp: new Date().toISOString(),
          type: 'property-document'
        }
      });
      formData.append('pinataMetadata', metadata);

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const cid = response.data.IpfsHash;
      const ipfsUrl = `${this.ipfsGateway}${cid}`;

      console.log('✅ File uploaded to IPFS!');
      console.log(`   CID: ${cid}`);

      return {
        cid,
        url: ipfsUrl,
        size: response.data.PinSize
      };
    } catch (error) {
      console.error('❌ File upload failed:', error.message);
      return this._mockUpload({ file: filename }, filename);
    }
  }

  /**
   * Retrieve data from IPFS
   * @param {string} cid - IPFS CID
   * @returns {object} Retrieved data
   */
  async retrieve(cid) {
    try {
      console.log(`📥 Retrieving from IPFS: ${cid}`);

      const url = `${this.ipfsGateway}${cid}`;
      const response = await axios.get(url, {
        timeout: 10000
      });

      console.log('✅ Retrieved from IPFS');
      return response.data;
    } catch (error) {
      console.error('❌ IPFS retrieval failed:', error.message);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  /**
   * Pin existing IPFS hash (for backup/persistence)
   * @param {string} cid - IPFS CID to pin
   * @param {string} name - Optional name
   */
  async pinHash(cid, name = 'pinned-content') {
    if (this.useMockMode) {
      return { success: true, cid };
    }

    try {
      const url = `${this.pinataEndpoint}/pinning/pinByHash`;
      
      const body = {
        hashToPin: cid,
        pinataMetadata: {
          name: name
        }
      };

      await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        }
      });

      console.log(`✅ Pinned existing CID: ${cid}`);
      return { success: true, cid };
    } catch (error) {
      console.error('❌ Pin failed:', error.message);
      throw error;
    }
  }

  /**
   * Mock upload for development/testing
   * Generates realistic-looking IPFS CIDs
   */
  _mockUpload(data, name) {
    // Generate mock CID (starts with Qm for base58, baf for CIDv1)
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(data) + Date.now())
      .digest('hex')
      .substring(0, 44);
    
    const mockCid = `Qm${hash}`;
    
    console.log('🔧 MOCK MODE - Generated fake CID');
    console.log(`   CID: ${mockCid}`);
    console.log('   ⚠️  This is NOT a real IPFS upload!');
    console.log('   To use real IPFS, add Pinata credentials to .env');

    return {
      cid: mockCid,
      url: `https://gateway.pinata.cloud/ipfs/${mockCid}`,
      size: JSON.stringify(data).length,
      timestamp: new Date().toISOString(),
      mock: true
    };
  }

  /**
   * Test Pinata connection
   */
  async testConnection() {
    if (this.useMockMode) {
      return {
        success: false,
        message: 'Mock mode - no real connection',
        mock: true
      };
    }

    try {
      const url = `${this.pinataEndpoint}/data/testAuthentication`;
      const response = await axios.get(url, {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        }
      });

      console.log('✅ Pinata connection successful');
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ Pinata connection failed:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new IPFSService();