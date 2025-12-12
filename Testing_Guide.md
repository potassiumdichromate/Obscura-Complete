# 🧪 Obscura - End-to-End Testing Guide

**Complete Postman collection for testing all 19 user-facing features**

---

## 📋 Table of Contents

1. [Setup](#setup)
2. [Testing Prerequisites](#testing-prerequisites)
3. [Alice's Journey (6 features)](#alices-journey)
4. [Bob's Journey (7 features)](#bobs-journey)
5. [Platform Operations (5 features)](#platform-operations)
6. [Dashboard Features (1 feature)](#dashboard-features)
7. [Troubleshooting](#troubleshooting)
8. [Postman Collection](#postman-collection)

---

## 🚀 Setup

### **1. Start Services**

```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data

# Terminal 2: Start Rust service
cd rust-service
cargo run
# Listening on http://localhost:3000

# Terminal 3: Start Node.js backend
cd backend
npm start
# Listening on http://localhost:5000
```

### **2. Verify Services**

```bash
# Check Node.js backend
curl http://localhost:5000/health
# Expected: { "status": "healthy" }

# Check Rust service
curl http://localhost:3000/health
# Expected: { "status": "ok" }

# Check MongoDB
mongo
> show dbs
> exit
```

### **3. Import Postman Collection**

Download and import: `Obscura-E2E-Tests.postman_collection.json`

Or create manually using the examples below.

---

## 🧑‍🔬 Testing Prerequisites

### **Test Data**

```javascript
// Alice (Property Developer)
const alice = {
  accountId: "0x55c21c68ac12c02030652d3798999b",
  userIdentifier: "alice"
};

// Bob (Investor)
const bob = {
  accountId: "0x69031e62d9a3081003cf63820d468d",
  userIdentifier: "bob"
};

// Property Details
const property = {
  propertyType: "residential",
  title: "Luxury London Villa",
  description: "Beautiful 3-bedroom villa in central London",
  country: "UK",
  city: "London",
  address: "123 Baker Street, Westminster",
  zipCode: "W1U 6AB",
  valuation: 5000000,
  squareFeet: 2500,
  bedrooms: 3,
  bathrooms: 2,
  images: ["villa-front.jpg", "villa-living.jpg", "villa-garden.jpg"],
  features: ["fireplace", "garden", "garage"],
  amenities: ["pool", "gym"]
};
```

---

## 👩‍💼 Alice's Journey (6 Features)

### **Feature 1: Alice Connects Wallet**

**Status:** Frontend only (no backend endpoint)

**Future Implementation:**
```javascript
// Web3 wallet connection
const provider = await detectEthereumProvider();
const accounts = await provider.request({ 
  method: 'eth_requestAccounts' 
});
```

---

### **Feature 2: Alice Generates Ownership Proof**

**Endpoint:** `POST /api/v1/proofs/generate-ownership`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/generate-ownership
Content-Type: application/json

{
  "propertyId": "PROP-TEST-001",
  "documentHash": "{{COMPUTED_HASH}}",
  "userIdentifier": "alice"
}
```

**How to Compute Hash:**
```javascript
// In Postman Pre-request Script:
const crypto = require('crypto');
const propertyId = "PROP-TEST-001";
const expectedHash = crypto.createHash('sha256')
  .update(propertyId + '-ownership')
  .digest('hex');
pm.environment.set("documentHash", expectedHash);
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "message": "Ownership proof generated and verified ✅",
  "proof": {
    "proofId": "673a5fae1234567890abcdef",
    "type": "ownership",
    "verified": true,
    "propertyId": "PROP-TEST-001",
    "createdAt": "2024-12-18T10:40:00.000Z",
    "expiresAt": "2025-03-18T10:40:00.000Z"
  }
}
```

**Save for Later:**
```javascript
// Postman Tests tab:
const response = pm.response.json();
pm.environment.set("aliceOwnershipProofId", response.proof.proofId);
```

**Verify:** ✅ Alice has ownership proof

---

### **Feature 3: Alice Mints Property**

**Endpoint:** `POST /api/v1/properties/mint`

**Postman Request:**
```
POST http://localhost:5000/api/v1/properties/mint
Content-Type: application/json

{
  "ownerAccountId": "0x55c21c68ac12c02030652d3798999b",
  "ownerUserIdentifier": "alice",
  "ownershipProofId": "{{aliceOwnershipProofId}}",
  "propertyType": "residential",
  "title": "Luxury London Villa",
  "description": "Beautiful 3-bedroom villa in central London",
  "country": "UK",
  "city": "London",
  "address": "123 Baker Street, Westminster",
  "zipCode": "W1U 6AB",
  "valuation": 5000000,
  "squareFeet": 2500,
  "bedrooms": 3,
  "bathrooms": 2,
  "yearBuilt": 1920,
  "images": ["villa-front.jpg", "villa-living.jpg", "villa-garden.jpg"],
  "documents": [],
  "features": ["fireplace", "garden", "garage"],
  "amenities": ["pool", "gym"]
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "message": "Property minted successfully with verified ownership ✅",
  "property": {
    "propertyId": "PROP-1734567890000",
    "ownerAccountId": "0x55c21c68ac12c02030652d3798999b",
    "ownershipVerified": true,
    "ownershipProofId": "673a5fae...",
    "status": "draft",
    "midenNoteId": "note_abc123",
    "midenTransactionId": "tx_def456",
    "price": 5000000,
    "metadata": { ... }
  },
  "blockchain": {
    "tx_id": "tx_def456",
    "note_id": "note_abc123"
  }
}
```

**Save for Later:**
```javascript
const response = pm.response.json();
pm.environment.set("propertyId", response.property.propertyId);
```

**Verify:** ✅ Property minted on blockchain

---

### **Feature 4: Alice Views Her Minted Property**

**Endpoint:** `GET /api/v1/properties/my-properties`

**Postman Request:**
```
GET http://localhost:5000/api/v1/properties/my-properties?userIdentifier=alice
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "count": 1,
  "properties": [
    {
      "propertyId": "PROP-1734567890000",
      "status": "draft",
      "price": 5000000,
      "metadata": {
        "title": "Luxury London Villa",
        "address": "123 Baker Street",
        "valuation": 5000000,
        ...
      },
      "midenNoteId": "note_abc123",
      "ownershipProofId": "673a5fae...",
      "views": 0,
      "uniqueViewers": 0
    }
  ]
}
```

**Verify:** ✅ Alice can see her property with full details

---

### **Feature 5: Alice Lists Property with Selective Disclosure**

**Endpoint:** `POST /api/v1/properties/list`

**Postman Request:**
```
POST http://localhost:5000/api/v1/properties/list
Content-Type: application/json

{
  "propertyId": "{{propertyId}}",
  "price": 5000000,
  "requiresAccreditation": true,
  "accreditationThreshold": 1000000,
  "requiresJurisdiction": true,
  "restrictedCountries": ["US", "KP", "IR"],
  "visibilityRules": {
    "valuation": "accredited_only",
    "address": "verified_only",
    "documents": "verified_only",
    "fullDetails": "verified_only"
  }
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Property listed successfully",
  "property": {
    "propertyId": "PROP-1734567890000",
    "status": "listed",
    "price": 5000000,
    "listedAt": "2024-12-18T11:00:00.000Z",
    "complianceRequirements": {
      "requiresAccreditation": true,
      "accreditationThreshold": 1000000,
      "requiresJurisdiction": true,
      "restrictedCountries": ["US", "KP", "IR"]
    },
    "visibilityRules": {
      "valuation": "accredited_only",
      "address": "verified_only",
      "documents": "verified_only",
      "fullDetails": "verified_only"
    }
  }
}
```

**Verify:** ✅ Property now listed on marketplace

---

### **Feature 6: Alice Approves/Rejects Offers**

**Get Offers for Property:**
```
GET http://localhost:5000/api/v1/offers?propertyId={{propertyId}}
```

**Accept Offer:**
```
POST http://localhost:5000/api/v1/offers/{{offerId}}/accept
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Offer accepted - compliance verified ✅",
  "offer": {
    "offerId": "OFFER-123",
    "status": "accepted",
    "acceptedAt": "2024-12-18T11:30:00.000Z"
  },
  "escrow": {
    "escrowId": "0xEscrow123",
    "amount": 5000000,
    "status": "created"
  }
}
```

**Reject Offer:**
```
POST http://localhost:5000/api/v1/offers/{{offerId}}/reject
Content-Type: application/json

{
  "reason": "Price too low"
}
```

**Save Escrow ID:**
```javascript
const response = pm.response.json();
pm.environment.set("escrowId", response.escrow.escrowId);
```

**Verify:** ✅ Alice can accept/reject offers

---

### **Feature 7: Alice Confirms Settlement**

**Check if Ready:**
```
GET http://localhost:5000/api/v1/settlement/{{offerId}}/check-ready
```

**Execute Settlement:**
```
POST http://localhost:5000/api/v1/settlement/{{offerId}}/execute
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Settlement executed successfully! 🎉",
  "settlement": {
    "offerId": "OFFER-123",
    "propertyId": "PROP-1734567890000",
    "buyer": "0x69031e62d9a3081003cf63820d468d",
    "seller": "0x55c21c68ac12c02030652d3798999b",
    "price": 5000000,
    "completedAt": "2024-12-18T12:00:00.000Z",
    "blockchain": {
      "propertyTransferTx": "0xTransfer123...",
      "escrowReleaseTx": "0xRelease456..."
    },
    "status": {
      "offerStatus": "completed",
      "propertyStatus": "sold"
    }
  }
}
```

**Verify:** ✅ Property transferred, Alice received funds

---

## 🧑‍💼 Bob's Journey (7 Features)

### **Feature 8: Bob Connects Wallet**

**Status:** Frontend only (same as Alice)

---

### **Feature 9: Bob Views Available Listings (Anonymized)**

**Endpoint:** `GET /api/v1/properties/available`

**Postman Request:**
```
GET http://localhost:5000/api/v1/properties/available?city=London&limit=10
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "count": 1,
  "properties": [
    {
      "propertyId": "PROP-1734567890000",
      "title": "Luxury London Villa",
      "description": "Beautiful 3-bedroom villa...",
      "propertyType": "residential",
      "price": 5000000,
      "location": "London, UK",
      "status": "listed",
      "images": ["villa-front.jpg", "villa-living.jpg"],
      "requiresAccreditation": true,
      "requiresJurisdiction": true,
      "listedAt": "2024-12-18T11:00:00.000Z",
      "locked": true
    }
  ]
}
```

**Verify:** ✅ Bob can browse properties (limited info)

---

### **Feature 10: Bob Generates Accreditation Proof**

**Endpoint:** `POST /api/v1/proofs/generate-accreditation`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/generate-accreditation
Content-Type: application/json

{
  "netWorth": 2500000,
  "threshold": 1000000,
  "userIdentifier": "bob"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "message": "Accreditation proof generated successfully ✅",
  "proof": {
    "proofId": "673a5f8c1234567890abcdef",
    "type": "accreditation",
    "verified": true,
    "threshold": 2000000,
    "createdAt": "2024-12-18T10:30:00.000Z",
    "expiresAt": "2025-03-18T10:30:00.000Z"
  }
}
```

**Save for Later:**
```javascript
const response = pm.response.json();
pm.environment.set("bobAccreditationProofId", response.proof.proofId);
```

**Verify:** ✅ Bob proved net worth ≥ $1M (without revealing $2.5M)

---

### **Feature 11: Bob Generates Jurisdiction Proof**

**Endpoint:** `POST /api/v1/proofs/generate-jurisdiction`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/generate-jurisdiction
Content-Type: application/json

{
  "countryCode": "UK",
  "restrictedCountries": ["US", "KP", "IR"],
  "userIdentifier": "bob"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "message": "Jurisdiction proof generated successfully ✅",
  "proof": {
    "proofId": "673a5f9d1234567890abcdef",
    "type": "jurisdiction",
    "verified": true,
    "restrictedCountries": ["US", "KP", "IR"],
    "createdAt": "2024-12-18T10:35:00.000Z",
    "expiresAt": "2025-03-18T10:35:00.000Z"
  }
}
```

**Save for Later:**
```javascript
const response = pm.response.json();
pm.environment.set("bobJurisdictionProofId", response.proof.proofId);
```

**Verify:** ✅ Bob proved country ∉ {US, KP, IR} (without revealing UK)

---

### **Feature 12: Bob Unlocks Full Property Details**

**Endpoint:** `GET /api/v1/properties/:propertyId/details`

**Test 1: Without Proofs (Should be Locked)**
```
GET http://localhost:5000/api/v1/properties/{{propertyId}}/details
```

**Expected:** Locked content, limited info

**Test 2: With Proofs (Should be Unlocked)**
```
GET http://localhost:5000/api/v1/properties/{{propertyId}}/details?userIdentifier=bob
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "property": {
    "propertyId": "PROP-1734567890000",
    "title": "Luxury London Villa",
    "price": 5000000,
    
    // ✅ UNLOCKED: Valuation (accredited_only)
    "valuation": 5000000,
    
    // ✅ UNLOCKED: Full Address (verified_only)
    "address": "123 Baker Street, Westminster",
    "zipCode": "W1U 6AB",
    "coordinates": {
      "latitude": 51.5074,
      "longitude": -0.1278
    },
    
    // ✅ UNLOCKED: Documents (verified_only)
    "documents": [...],
    "ipfsCid": "QmXyz123...",
    
    // ✅ UNLOCKED: Full Details (verified_only)
    "squareFeet": 2500,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 1920,
    "features": ["fireplace", "garden", "garage"],
    "amenities": ["pool", "gym"],
    "allImages": ["villa-front.jpg", "villa-living.jpg", "villa-garden.jpg"],
    "virtualTourUrl": null,
    
    "locked": false,
    
    "complianceRequirements": {
      "accreditation": {
        "required": true,
        "threshold": 1000000
      },
      "jurisdiction": {
        "required": true,
        "restrictedCountries": ["US", "KP", "IR"]
      }
    },
    
    "userCompliance": {
      "hasAccreditation": true,
      "hasJurisdiction": true,
      "canMakeOffer": true
    }
  }
}
```

**Verify:** ✅ Bob sees FULL details after proving compliance

---

### **Feature 13: Bob Submits Purchase Offer**

**Check Eligibility First:**
```
GET http://localhost:5000/api/v1/offers/check-eligibility?propertyId={{propertyId}}&userIdentifier=bob
```

**Expected Response:**
```json
{
  "success": true,
  "eligibility": {
    "canMakeOffer": true,
    "requirements": [
      { "type": "accreditation", "status": "verified" },
      { "type": "jurisdiction", "status": "verified" }
    ],
    "missingProofs": []
  }
}
```

**Submit Offer:**
```
POST http://localhost:5000/api/v1/offers/create
Content-Type: application/json

{
  "propertyId": "{{propertyId}}",
  "buyerAccountId": "0x69031e62d9a3081003cf63820d468d",
  "sellerAccountId": "0x55c21c68ac12c02030652d3798999b",
  "offerPrice": 5000000,
  "userIdentifier": "bob",
  "message": "I would like to purchase this property"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "message": "Offer created successfully - all compliance requirements met ✅",
  "offer": {
    "offerId": "OFFER-1734567890000",
    "propertyId": "PROP-1734567890000",
    "status": "pending",
    "offerPrice": 5000000,
    "createdAt": "2024-12-18T11:15:00.000Z",
    "expiresAt": "2024-12-25T11:15:00.000Z"
  },
  "compliance": {
    "accreditationVerified": true,
    "jurisdictionVerified": true,
    "proofDetails": {
      "accreditation": {
        "proofId": "673a5f8c...",
        "threshold": 2000000,
        "expiresAt": "2025-03-18T10:30:00.000Z"
      },
      "jurisdiction": {
        "proofId": "673a5f9d...",
        "restrictedCount": 3,
        "expiresAt": "2025-03-18T10:35:00.000Z"
      }
    }
  }
}
```

**Save for Later:**
```javascript
const response = pm.response.json();
pm.environment.set("offerId", response.offer.offerId);
```

**Verify:** ✅ Offer created only after proof verification

---

### **Feature 14: Bob Locks Funds in Escrow**

**Status:** Automatic (done when Alice accepts offer)

**Verify Escrow Created:**
```
GET http://localhost:5000/api/v1/offers/{{offerId}}
```

**Check for:**
```json
{
  "escrowId": "0xEscrow123...",
  "status": "accepted"
}
```

**Verify:** ✅ Funds locked in escrow

---

### **Feature 15: Bob Confirms Settlement**

**Same as Alice's Feature 7** (Settlement is mutual)

**Verify:** ✅ Bob receives property ownership

---

## 🏢 Platform Operations (5 Features)

### **Feature 16: Platform Verifies Bob's Accreditation Proof**

**Endpoint:** `POST /api/v1/proofs/check-requirement`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/check-requirement
Content-Type: application/json

{
  "userIdentifier": "bob",
  "requiredThreshold": 1000000
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "hasValidProof": true,
  "proof": {
    "proofId": "673a5f8c...",
    "threshold": 2000000,
    "expiresAt": "2025-03-18T10:30:00.000Z"
  }
}
```

**Verify:** ✅ Platform verified proof without seeing net worth

---

### **Feature 17: Platform Verifies Bob's Jurisdiction Proof**

**Endpoint:** `POST /api/v1/proofs/check-jurisdiction`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/check-jurisdiction
Content-Type: application/json

{
  "userIdentifier": "bob"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "hasValidProof": true,
  "proof": {
    "proofId": "673a5f9d...",
    "restrictedCountries": ["US", "KP", "IR"],
    "expiresAt": "2025-03-18T10:35:00.000Z"
  }
}
```

**Verify:** ✅ Platform verified proof without seeing country

---

### **Feature 18: Platform Verifies Alice's Ownership Proof**

**Endpoint:** `POST /api/v1/proofs/verify-ownership`

**Postman Request:**
```
POST http://localhost:5000/api/v1/proofs/verify-ownership
Content-Type: application/json

{
  "proofId": "{{aliceOwnershipProofId}}"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "verification": {
    "proofId": "673a5fae...",
    "verified": true,
    "expired": false,
    "valid": true,
    "propertyId": "PROP-001",
    "createdAt": "2024-12-18T10:40:00.000Z",
    "expiresAt": "2025-03-18T10:40:00.000Z"
  }
}
```

**Verify:** ✅ Platform verified ownership before minting

---

### **Feature 19: Platform Checks Compliance Before Settlement**

**Endpoint:** `GET /api/v1/settlement/:offerId/check-ready`

**Postman Request:**
```
GET http://localhost:5000/api/v1/settlement/{{offerId}}/check-ready
```

**Expected Response (Ready):** `200 OK`
```json
{
  "success": true,
  "readyToSettle": true,
  "checks": {
    "offerAccepted": true,
    "escrowCreated": true,
    "escrowFunded": true,
    "buyerAccreditation": true,
    "buyerJurisdiction": true,
    "propertyOwnership": true,
    "proofsNotExpired": true,
    "propertyAvailable": true
  },
  "offer": {
    "offerId": "OFFER-123",
    "propertyId": "PROP-001",
    "status": "accepted",
    "escrowId": "0xEscrow123"
  }
}
```

**Expected Response (Not Ready):**
```json
{
  "success": true,
  "readyToSettle": false,
  "checks": {
    "offerAccepted": true,
    "escrowCreated": false,
    "escrowFunded": false,
    ...
  },
  "blockers": [
    "Escrow not created",
    "Escrow not funded"
  ]
}
```

**Verify:** ✅ Platform ensures all requirements met

---

### **Feature 20: Platform Executes Atomic Settlement**

**Already tested in Alice/Bob's Feature 7**

**Verify:**
- ✅ Property transfer + Escrow release = Atomic
- ✅ If any step fails → Everything rolls back
- ✅ No partial state ever exists

---

## 📊 Dashboard Features (1 Feature)

### **Feature 21: Public Proof Event Log**

**View All Events:**
```
GET http://localhost:5000/api/v1/proofs/events/public?limit=50
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "count": 10,
  "total": 10,
  "page": 1,
  "totalPages": 1,
  "events": [
    {
      "eventId": "EVT-001",
      "type": "proof_generated",
      "proofType": "accreditation",
      "userHash": "5f3a7b2c",
      "verified": true,
      "timestamp": "2024-12-18T10:30:00.000Z",
      "proofHash": "0xABC123..."
    },
    {
      "eventId": "EVT-002",
      "type": "proof_generated",
      "proofType": "jurisdiction",
      "userHash": "8d1e4f9a",
      "verified": true,
      "timestamp": "2024-12-18T10:35:00.000Z",
      "proofHash": "0xDEF456..."
    }
  ]
}
```

**Filter by Type:**
```
GET http://localhost:5000/api/v1/proofs/events/public?proofType=accreditation
```

**Verify:** ✅ Anyone can view proof events (anonymized)

---

### **Feature 22: Alice and Bob View Their Proof History**

**Bob's Proof History:**
```
GET http://localhost:5000/api/v1/proofs/history/my?userIdentifier=bob
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "active": 2,
    "expired": 0,
    "byType": {
      "accreditation": 1,
      "jurisdiction": 1,
      "ownership": 0
    }
  },
  "history": [
    {
      "proofId": "673a5f8c...",
      "type": "accreditation",
      "status": "verified",
      "createdAt": "2024-12-18T10:30:00.000Z",
      "expiresAt": "2025-03-18T10:30:00.000Z",
      "isValid": true,
      "daysUntilExpiry": 90,
      "threshold": 2000000
    },
    {
      "proofId": "673a5f9d...",
      "type": "jurisdiction",
      "status": "verified",
      "createdAt": "2024-12-18T10:35:00.000Z",
      "expiresAt": "2025-03-18T10:35:00.000Z",
      "isValid": true,
      "daysUntilExpiry": 90,
      "restrictedCount": 3
    }
  ]
}
```

**Alice's Proof History:**
```
GET http://localhost:5000/api/v1/proofs/history/my?userIdentifier=alice
```

**Verify:** ✅ Users can see their own proof history

---

### **Feature 23: Platform Statistics**

**Get Statistics:**
```
GET http://localhost:5000/api/v1/proofs/statistics
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "statistics": {
    "total": 3,
    "verified": 3,
    "active": 3,
    "expired": 0,
    "byType": {
      "accreditation": {
        "total": 1,
        "verified": 1
      },
      "jurisdiction": {
        "total": 1,
        "verified": 1
      },
      "ownership": {
        "total": 1,
        "verified": 1
      }
    },
    "events": {
      "accreditation_proof_generated": 1,
      "jurisdiction_proof_generated": 1,
      "ownership_proof_generated": 1
    }
  }
}
```

**Verify:** ✅ Platform analytics available

---

## 🐛 Troubleshooting

### **Common Issues**

**1. "Ownership proof required"**
- **Solution:** Generate ownership proof first before minting

**2. "Buyer does not meet compliance requirements"**
- **Solution:** Bob must generate both accreditation and jurisdiction proofs

**3. "Settlement failed - proofs expired"**
- **Solution:** Re-generate proofs (90-day validity)

**4. "Property transfer failed"**
- **Solution:** Check Rust service is running on port 3000

**5. "MongoDB connection error"**
- **Solution:** Start MongoDB: `mongod --dbpath ./data`

---

## 📦 Postman Collection

### **Environment Variables**

```json
{
  "propertyId": "",
  "offerId": "",
  "escrowId": "",
  "aliceOwnershipProofId": "",
  "bobAccreditationProofId": "",
  "bobJurisdictionProofId": "",
  "documentHash": ""
}
```

### **Collection Structure**

```
Obscura E2E Tests/
├── Setup/
│   ├── Health Check
│   └── Clear All Data (Testing)
├── Alice's Journey/
│   ├── 1. Generate Ownership Proof
│   ├── 2. Mint Property
│   ├── 3. View My Properties
│   ├── 4. List Property
│   ├── 5. Accept Offer
│   └── 6. Execute Settlement
├── Bob's Journey/
│   ├── 1. Browse Marketplace
│   ├── 2. View Property (Locked)
│   ├── 3. Generate Accreditation Proof
│   ├── 4. Generate Jurisdiction Proof
│   ├── 5. View Property (Unlocked)
│   ├── 6. Check Eligibility
│   ├── 7. Submit Offer
│   └── 8. Execute Settlement
├── Platform Operations/
│   ├── 1. Verify Accreditation
│   ├── 2. Verify Jurisdiction
│   ├── 3. Verify Ownership
│   ├── 4. Check Settlement Ready
│   └── 5. Get Settlement History
└── Dashboard/
    ├── 1. Public Proof Events
    ├── 2. Bob's Proof History
    ├── 3. Alice's Proof History
    └── 4. Platform Statistics
```

---

## ✅ Complete Test Checklist

### **Alice (6 features):**
- [x] Connect wallet (Frontend)
- [x] Generate ownership proof
- [x] Mint property
- [x] View minted property
- [x] List property with selective disclosure
- [x] Accept offer
- [x] Confirm settlement

### **Bob (7 features):**
- [x] Connect wallet (Frontend)
- [x] Browse marketplace (anonymized)
- [x] Generate accreditation proof
- [x] Generate jurisdiction proof
- [x] Unlock property details
- [x] Submit offer
- [x] Lock funds in escrow
- [x] Confirm settlement

### **Platform (5 features):**
- [x] Verify accreditation proof
- [x] Verify jurisdiction proof
- [x] Verify ownership proof
- [x] Check compliance before settlement
- [x] Execute atomic settlement

### **Dashboard (1 feature):**
- [x] View proof events
- [x] View proof verification results
- [x] View user proof history

---

## 🎉 Success Criteria

**All 19 features tested successfully when:**

✅ Alice can mint property with ownership verification  
✅ Alice can list property with compliance requirements  
✅ Bob sees limited info without proofs  
✅ Bob generates proofs without revealing sensitive data  
✅ Bob sees full details after proving compliance  
✅ Bob can make offer only with valid proofs  
✅ Settlement executes atomically (all or nothing)  
✅ Public transparency with anonymized data  
✅ Users can view their proof history  

---

**Testing Time:** ~30 minutes for complete end-to-end flow

**Happy Testing!** 🚀