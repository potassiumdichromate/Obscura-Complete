# 🏗️ Obscura - Technical Design Document

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Zero-Knowledge Proof System](#zero-knowledge-proof-system)
5. [Selective Disclosure Engine](#selective-disclosure-engine)
6. [Atomic Settlement System](#atomic-settlement-system)
7. [Data Models](#data-models)
8. [Security Architecture](#security-architecture)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment Architecture](#deployment-architecture)

---

## 1. Executive Summary

### **1.1 Project Overview**

**Obscura** is a privacy-preserving real estate tokenization platform built on Polygon Miden blockchain. The system enables property developers to tokenize and list properties while maintaining strict compliance requirements, and allows investors to prove eligibility without revealing sensitive personal information.

### **1.2 Key Innovation**

The core innovation is the integration of **zero-knowledge STARK proofs** with a **selective disclosure engine**, enabling:
- Investors prove accreditation without revealing net worth
- Investors prove jurisdiction eligibility without revealing location
- Property owners prove ownership without revealing documents
- Public transparency without compromising privacy

### **1.3 Technical Challenges Solved**

1. **Privacy vs Compliance:** ZK proofs enable both simultaneously
2. **Selective Disclosure:** Dynamic content filtering based on proof verification
3. **Atomic Settlements:** All-or-nothing transaction guarantees
4. **Fraud Prevention:** Ownership verification before property minting
5. **Transparency:** Public audit trail with anonymized data

---

## 2. System Architecture

### **2.1 High-Level Architecture**

```
┌────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│                  (React/Next.js - Future)                  │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ REST API (HTTP/JSON)
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│              (Node.js + Express.js)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Controller Layer                           │  │
│  │  • PropertyController                                 │  │
│  │  • ProofController                                    │  │
│  │  • OfferController                                    │  │
│  │  • SettlementController                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Business Logic Layer                        │  │
│  │  • Selective Disclosure Engine                        │  │
│  │  • Proof Verification Logic                           │  │
│  │  • Atomic Settlement Orchestrator                     │  │
│  │  • Compliance Enforcement                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Data Access Layer                           │  │
│  │  • Mongoose ODM                                       │  │
│  │  • MongoDB Queries                                    │  │
│  │  • Transaction Management                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬──────────────────────────────────┬───────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌────────────────────┐           ┌────────────────────────┐
│   DATA LAYER       │           │  ZK PROOF LAYER        │
│   (MongoDB)        │           │  (Rust Service)        │
│                    │           │                        │
│  Collections:      │           │  Components:           │
│  • Properties      │           │  • STARK Prover        │
│  • Proofs          │           │  • Miden VM Client     │
│  • Offers          │           │  • MASM Circuits       │
│  • ProofEvents     │           │  • Verification Logic  │
│                    │           │                        │
│  Features:         │           │  Port: 3000            │
│  • Transactions    │           └────────┬───────────────┘
│  • Indexes         │                    │
│  • Aggregations    │                    │
│                    │                    │
│  Port: 27017       │                    │
└────────────────────┘                    │
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  BLOCKCHAIN LAYER      │
                              │  (Polygon Miden)       │
                              │                        │
                              │  Operations:           │
                              │  • Property NFT Mint   │
                              │  • Property Transfer   │
                              │  • Escrow Creation     │
                              │  • Escrow Funding      │
                              │  • Escrow Release      │
                              │                        │
                              │  Features:             │
                              │  • STARK Proofs        │
                              │  • Privacy Layer       │
                              │  • Smart Contracts     │
                              └────────────────────────┘
```

### **2.2 Component Interaction Flow**

#### **Example: Bob Makes Offer**

```
1. Client Request
   POST /api/v1/offers/create
   ↓
2. OfferController
   validateInput()
   ↓
3. Business Logic
   checkBuyerProofs()
   ├─ Query MongoDB for accreditation proof
   ├─ Query MongoDB for jurisdiction proof
   └─ Verify proof validity & expiration
   ↓
4. Database Layer
   createOffer()
   saveProofReferences()
   ↓
5. Response
   { success: true, offer: {...}, compliance: {...} }
```

### **2.3 Service Communication**

```
Node.js Backend ←→ Rust Service (HTTP/REST)
      ↓
   MongoDB (Driver)
      ↓
Rust Service ←→ Miden Blockchain (RPC)
```

**Communication Pattern:**
- Node.js → Rust: REST API calls (axios)
- Rust → Miden: RPC calls (miden-client)
- Node.js → MongoDB: Mongoose ODM

---

## 3. Technology Stack

### **3.1 Backend Services**

#### **Node.js Application**
```yaml
Runtime: Node.js v18+
Framework: Express.js v4.18
Language: JavaScript (ES6+)
Package Manager: npm
Port: 5000
```

**Key Dependencies:**
```json
{
  "express": "^4.18.0",
  "mongoose": "^7.0.0",
  "axios": "^1.6.0",
  "dotenv": "^16.0.0"
}
```

#### **Rust Service**
```yaml
Language: Rust v1.70+
Build Tool: Cargo
Port: 3000
```

**Key Dependencies:**
```toml
[dependencies]
miden-client = "0.12"
actix-web = "4.0"
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
```

### **3.2 Blockchain Layer**

#### **Polygon Miden**
```yaml
Type: Privacy-preserving Layer 2
Proof System: STARK (Scalable Transparent ARguments of Knowledge)
VM: Miden VM (RISC-based)
Assembly: MASM (Miden Assembly)
```

**Key Features:**
- Native ZK proof support
- Privacy-preserving transactions
- Efficient verification
- Programmable privacy

### **3.3 Database**

#### **MongoDB**
```yaml
Version: 6.0+
Driver: Mongoose ODM
Port: 27017
```

**Features Used:**
- Document storage
- Transactions (ACID)
- Indexes
- Aggregation pipeline

### **3.4 Development Tools**

```yaml
Version Control: Git
Testing: Jest, Postman
Documentation: Markdown
API Design: REST
Logging: Console + Morgan
```

---

## 4. Zero-Knowledge Proof System

### **4.1 Proof Architecture**

```
User Input → Preprocessing → Miden VM → STARK Proof → Verification
                                ↓
                          MASM Circuit
```

### **4.2 Proof Types**

#### **4.2.1 Accreditation Proof**

**Purpose:** Prove `net_worth ≥ threshold` without revealing actual net worth

**MASM Circuit:**
```masm
# Accreditation Proof Circuit
# Input: SECRET_NET_WORTH (private), PUBLIC_THRESHOLD (public)
# Output: Proof that net_worth >= threshold

proc.verify_accreditation
    # Load private input (net worth)
    push.SECRET_NET_WORTH
    mem_load
    
    # Load public input (threshold)
    push.PUBLIC_THRESHOLD
    
    # Comparison: net_worth >= threshold
    gte
    
    # Assert proof (fails if false)
    assert.err=ACCREDITATION_FAILED
    
    # Return success
    push.1
end

# Main execution
begin
    exec.verify_accreditation
end
```

**Flow:**
```
1. User provides: net_worth (kept private)
2. System provides: threshold (public)
3. Circuit computes: net_worth >= threshold
4. If true: Generate STARK proof
5. Proof verifies statement without revealing net_worth
```

**Security:**
- Net worth never leaves user's environment
- Only ZK proof is transmitted
- Verifier learns only Boolean result
- Cryptographically sound (STARK security)

---

#### **4.2.2 Jurisdiction Proof**

**Purpose:** Prove `country ∉ restricted_list` without revealing actual country

**MASM Circuit:**
```masm
# Jurisdiction Proof Circuit
# Input: SECRET_COUNTRY (private), RESTRICTED_LIST (public)
# Output: Proof that country not in restricted list

proc.verify_jurisdiction
    # Load private input (country code)
    push.SECRET_COUNTRY
    mem_load
    
    # Load restricted list
    push.RESTRICTED_LIST_START
    push.RESTRICTED_LIST_COUNT
    
    # Check if country in list
    exec.check_membership
    
    # Negate result (we want NOT in list)
    not
    
    # Assert proof
    assert.err=JURISDICTION_FAILED
    
    # Return success
    push.1
end

proc.check_membership
    # Implementation of membership check
    # Returns 1 if country in list, 0 otherwise
    # ... membership logic ...
end

begin
    exec.verify_jurisdiction
end
```

**Flow:**
```
1. User provides: country_code (kept private)
2. System provides: restricted_countries (public)
3. Circuit computes: country ∉ restricted_list
4. If true: Generate STARK proof
5. Proof verifies eligibility without revealing country
```

---

#### **4.2.3 Ownership Proof**

**Purpose:** Prove `hash(document) = expected_hash` without revealing document

**Implementation:**
```javascript
// Simplified POC version (production would use full MASM circuit)

function generateOwnershipProof(documentHash, propertyId) {
  // Compute expected hash
  const expectedHash = sha256(propertyId + '-ownership');
  
  // Generate proof
  const proof = {
    propertyId,
    documentHashProvided: documentHash,
    expectedHash,
    matches: documentHash === expectedHash,
    timestamp: Date.now()
  };
  
  // In production: Use full MASM circuit for ZK proof
  // const zkProof = await midenVM.prove(circuit, proof);
  
  return proof;
}
```

**Production MASM Circuit (Future):**
```masm
proc.verify_ownership
    # Load document hash (private)
    push.SECRET_DOCUMENT_HASH
    mem_load
    
    # Load expected hash (public)
    push.EXPECTED_HASH
    
    # Compare hashes
    eq
    
    # Assert match
    assert.err=OWNERSHIP_FAILED
    
    push.1
end
```

---

### **4.3 Proof Generation Flow**

```
┌──────────────┐
│ User Input   │
│ (Private)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Preprocess   │ ← Convert to field elements
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ MASM Circuit │ ← Execute computation
│ (Miden VM)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Trace Gen    │ ← Generate execution trace
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ STARK Prover │ ← Create ZK proof
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Proof Data   │
│ (Public)     │
└──────────────┘
```

### **4.4 Proof Verification Flow**

```
┌──────────────┐
│ Proof Data   │
│ + Public     │
│   Inputs     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ STARK        │ ← Verify proof validity
│ Verifier     │
└──────┬───────┘
       │
       ├─ Valid ──→ Accept
       │
       └─ Invalid ─→ Reject
```

**Verification Time:** < 50ms (STARK proofs verify quickly)

---

### **4.5 Proof Storage & Management**

**MongoDB Schema:**
```javascript
{
  proofId: "673a5f8c1234567890abcdef",
  userIdentifier: "bob",
  type: "accreditation",
  proofData: "{...}", // Serialized STARK proof
  verified: true,
  threshold: 2000000, // Type-specific field
  createdAt: "2024-12-18T10:30:00.000Z",
  expiresAt: "2025-03-18T10:30:00.000Z" // 90-day validity
}
```

**Proof Lifecycle:**
```
Generate → Store → Verify → Use → Expire
   ↓         ↓       ↓       ↓       ↓
  2-3s     <10ms   <50ms   <100ms  Auto
```

---

## 5. Selective Disclosure Engine

### **5.1 Architecture**

```
Request → Check Proofs → Build Response → Return Filtered Data
            ↓
      MongoDB Query
            ↓
    Proof Validation
```

### **5.2 Disclosure Levels**

#### **Level 1: Public (No Proofs)**
```javascript
{
  propertyId: "PROP-001",
  title: "Luxury Villa",
  price: 5000000,
  location: "London, UK",  // ← City-level only
  propertyType: "residential",
  images: ["img1.jpg", "img2.jpg"],  // ← Limited (2)
  locked: true
}
```

#### **Level 2: Accredited (Accreditation Proof)**
```javascript
{
  ...publicData,
  valuation: 5000000,  // ← UNLOCKED
  squareFeet: 2500,
  bedrooms: 3,
  bathrooms: 2
}
```

#### **Level 3: Fully Verified (Both Proofs)**
```javascript
{
  ...accreditedData,
  address: "123 Baker Street",  // ← UNLOCKED
  zipCode: "W1U 6AB",
  coordinates: { lat: 51.5074, lng: -0.1278 },
  documents: [...],  // ← UNLOCKED
  fullDetails: {...},  // ← UNLOCKED
  locked: false
}
```

### **5.3 Implementation**

```javascript
// Property Model Method
propertySchema.methods.getDetailsForUser = function(hasAccreditation, hasJurisdiction) {
  const verified = hasAccreditation && hasJurisdiction;
  const response = this.getPublicPreview(); // Base data
  
  // Check each visibility rule
  if (shouldShow(this.visibilityRules.valuation, hasAccreditation, verified)) {
    response.valuation = this.metadata.valuation;
  }
  
  if (shouldShow(this.visibilityRules.address, hasAccreditation, verified)) {
    response.address = this.metadata.address;
    response.zipCode = this.metadata.zipCode;
  }
  
  if (shouldShow(this.visibilityRules.documents, hasAccreditation, verified)) {
    response.documents = this.metadata.documents;
  }
  
  return response;
};

function shouldShow(rule, hasAccred, verified) {
  if (rule === 'public') return true;
  if (rule === 'accredited_only') return hasAccred;
  if (rule === 'verified_only') return verified;
  return false;
}
```

### **5.4 Proof Checking Logic**

```javascript
// In propertyController.js

async getPropertyDetails(req, res) {
  const { propertyId } = req.params;
  const { userIdentifier } = req.query;
  
  const property = await Property.findOne({ propertyId });
  
  // Check accreditation proof
  let hasAccreditation = false;
  if (property.requiresAccreditation) {
    const proof = await Proof.findOne({
      userIdentifier,
      type: 'accreditation',
      verified: true,
      threshold: { $gte: property.accreditationThreshold },
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    hasAccreditation = !!proof;
  } else {
    hasAccreditation = true; // Not required
  }
  
  // Check jurisdiction proof
  let hasJurisdiction = false;
  if (property.requiresJurisdiction) {
    const proof = await Proof.findOne({
      userIdentifier,
      type: 'jurisdiction',
      verified: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    hasJurisdiction = !!proof;
  } else {
    hasJurisdiction = true; // Not required
  }
  
  // Build response with appropriate disclosure level
  const details = property.getDetailsForUser(hasAccreditation, hasJurisdiction);
  
  res.json({ success: true, property: details });
}
```

---

## 6. Atomic Settlement System

### **6.1 Architecture**

```
Pre-flight Check → Start Transaction → Execute Steps → Commit/Rollback
                        ↓
                MongoDB Transaction
                        ↓
              Session Management
```

### **6.2 Transaction Pattern**

```javascript
async function executeSettlement(offerId) {
  const session = await mongoose.startSession();
  
  try {
    // START TRANSACTION
    session.startTransaction();
    
    // STEP 1: Verify offer
    const offer = await Offer.findOne({ offerId }).session(session);
    if (offer.status !== 'accepted') throw new Error('Not accepted');
    
    // STEP 2: Re-verify proofs
    const proofsValid = await verifyBuyerProofs(offer.buyerUserIdentifier);
    if (!proofsValid) throw new Error('Proofs expired');
    
    // STEP 3: Transfer property on blockchain
    const transferTx = await midenClient.transferProperty(
      offer.propertyId,
      offer.buyerAccountId
    );
    
    // STEP 4: Release escrow on blockchain
    const releaseTx = await midenClient.releaseEscrow(
      offer.escrowId,
      offer.sellerAccountId
    );
    
    // STEP 5: Update database
    offer.status = 'completed';
    offer.completedAt = new Date();
    offer.settlementTxIds = { transferTx, releaseTx };
    await offer.save({ session });
    
    const property = await Property.findOne({ propertyId: offer.propertyId }).session(session);
    property.status = 'sold';
    property.soldAt = new Date();
    property.soldTo = offer.buyerAccountId;
    await property.save({ session });
    
    // COMMIT TRANSACTION
    await session.commitTransaction();
    
    return { success: true, settlement: {...} };
    
  } catch (error) {
    // ROLLBACK TRANSACTION
    await session.abortTransaction();
    
    return { success: false, error: error.message };
    
  } finally {
    session.endSession();
  }
}
```

### **6.3 Atomicity Guarantees**

**MongoDB Transactions:**
- ACID compliant
- All-or-nothing execution
- Automatic rollback on failure
- Session-based isolation

**Failure Scenarios:**

| Scenario | Result |
|----------|--------|
| Offer not accepted | ❌ Immediate failure, no changes |
| Proofs expired | ❌ Rollback, no property transfer |
| Property transfer fails | ❌ Rollback, no escrow release |
| Escrow release fails | ❌ Rollback, no database update |
| Database update fails | ❌ Rollback everything |
| All steps succeed | ✅ Commit all changes |

### **6.4 Pre-Flight Check**

```javascript
async function checkSettlementReady(offerId) {
  const checks = {
    offerAccepted: false,
    escrowCreated: false,
    escrowFunded: false,
    buyerAccreditation: false,
    buyerJurisdiction: false,
    propertyOwnership: true,
    proofsNotExpired: false,
    propertyAvailable: false
  };
  
  // Verify each requirement
  const offer = await Offer.findOne({ offerId });
  checks.offerAccepted = offer.status === 'accepted';
  checks.escrowCreated = !!offer.escrowId;
  
  const accreditationProof = await Proof.findOne({
    userIdentifier: offer.buyerUserIdentifier,
    type: 'accreditation',
    verified: true,
    expiresAt: { $gt: new Date() }
  });
  checks.buyerAccreditation = !!accreditationProof;
  
  // ... check other requirements ...
  
  const readyToSettle = Object.values(checks).every(v => v === true);
  
  return { readyToSettle, checks };
}
```

---

## 7. Data Models

### **7.1 Property Model**

```javascript
const propertySchema = new mongoose.Schema({
  // Identity
  propertyId: { type: String, unique: true, required: true },
  ownerAccountId: { type: String, required: true },
  ownerUserIdentifier: { type: String, required: true },
  ownershipProofId: { type: String, default: null },
  
  // Blockchain
  midenNoteId: { type: String },
  midenTransactionId: { type: String },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'listed', 'offer_pending', 'sold', 'delisted'],
    default: 'draft'
  },
  
  // Pricing
  price: { type: Number, required: true },
  
  // Compliance
  requiresAccreditation: { type: Boolean, default: false },
  accreditationThreshold: { type: Number, default: 1000000 },
  requiresJurisdiction: { type: Boolean, default: false },
  restrictedCountries: [String],
  
  // Selective Disclosure
  visibilityRules: {
    valuation: { type: String, enum: ['public', 'accredited_only', 'verified_only'] },
    address: { type: String, enum: ['public', 'accredited_only', 'verified_only'] },
    documents: { type: String, enum: ['public', 'accredited_only', 'verified_only'] },
    fullDetails: { type: String, enum: ['public', 'accredited_only', 'verified_only'] }
  },
  
  // Property Data
  metadata: {
    propertyType: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    country: String,
    city: String,
    address: String,
    valuation: Number,
    squareFeet: Number,
    bedrooms: Number,
    bathrooms: Number,
    images: [String],
    documents: [Object]
  },
  
  // Analytics
  views: { type: Number, default: 0 },
  uniqueViewers: [String],
  
  // Dates
  listedAt: Date,
  soldAt: Date
}, { 
  timestamps: true 
});

// Indexes
propertySchema.index({ status: 1, listedAt: -1 });
propertySchema.index({ ownerAccountId: 1, status: 1 });
propertySchema.index({ price: 1, status: 1 });
```

### **7.2 Proof Model**

```javascript
const proofSchema = new mongoose.Schema({
  // Identity
  proofId: { type: String, unique: true, required: true },
  userIdentifier: { type: String, required: true },
  
  // Type
  type: { 
    type: String, 
    enum: ['accreditation', 'jurisdiction', 'ownership'],
    required: true
  },
  
  // Proof Data
  proofData: { type: String, required: true }, // Serialized STARK proof
  verified: { type: Boolean, required: true },
  
  // Type-specific fields
  threshold: Number, // Accreditation
  restrictedCountries: [String], // Jurisdiction
  propertyId: String, // Ownership
  
  // Validity
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

// Indexes
proofSchema.index({ userIdentifier: 1, type: 1, createdAt: -1 });
proofSchema.index({ type: 1, verified: 1, expiresAt: 1 });
```

### **7.3 Offer Model**

```javascript
const offerSchema = new mongoose.Schema({
  // Identity
  offerId: { type: String, unique: true, required: true },
  propertyId: { type: String, required: true },
  
  // Parties
  buyerAccountId: { type: String, required: true },
  sellerAccountId: { type: String, required: true },
  buyerUserIdentifier: { type: String },
  
  // Terms
  offerPrice: { type: Number, required: true },
  message: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'expired'],
    default: 'pending'
  },
  
  // Escrow
  escrowId: String,
  
  // Verified Proofs
  verifiedProofs: {
    accreditation: {
      proofId: String,
      threshold: Number,
      expiresAt: Date
    },
    jurisdiction: {
      proofId: String,
      restrictedCount: Number,
      expiresAt: Date
    }
  },
  
  // Settlement
  completedAt: Date,
  settlementTxIds: {
    propertyTransfer: String,
    escrowRelease: String
  },
  
  // Dates
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

// Indexes
offerSchema.index({ propertyId: 1, status: 1 });
offerSchema.index({ buyerAccountId: 1, status: 1 });
offerSchema.index({ status: 1, createdAt: -1 });
```

### **7.4 ProofEvent Model**

```javascript
const proofEventSchema = new mongoose.Schema({
  // Identity
  eventId: { type: String, unique: true, required: true },
  
  // Type
  type: {
    type: String,
    enum: ['proof_generated', 'proof_verified', 'proof_used'],
    required: true
  },
  proofType: {
    type: String,
    enum: ['accreditation', 'jurisdiction', 'ownership'],
    required: true
  },
  
  // Anonymized Data
  userHash: { type: String, required: true }, // SHA256(userIdentifier)
  proofId: { type: String, required: true },
  proofHash: String, // SHA256(proofData)
  
  // Verification
  verified: Boolean,
  
  // Context
  context: Object,
  
  // Timestamp
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
proofEventSchema.index({ type: 1, timestamp: -1 });
proofEventSchema.index({ proofType: 1, timestamp: -1 });
proofEventSchema.index({ userHash: 1, timestamp: -1 });
```

---

## 8. Security Architecture

### **8.1 Privacy Guarantees**

**Zero-Knowledge Proofs:**
- Cryptographic security (STARK soundness)
- No information leakage
- Verifiable without revealing secrets
- Post-quantum secure (planned)

**Data Minimization:**
- Only necessary data stored
- Sensitive data never leaves client
- Proof hashes instead of proof data
- User identifiers anonymized in events

### **8.2 Authentication & Authorization**

**Current (POC):**
- No authentication (testing only)
- All endpoints public

**Production (Recommended):**
```javascript
// JWT-based authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireOwner = (req, res, next) => {
  const property = await Property.findOne({ propertyId: req.params.propertyId });
  if (property.ownerUserIdentifier !== req.user.identifier) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### **8.3 Input Validation**

```javascript
// Example validation middleware
const validateMintInput = (req, res, next) => {
  const { ownerAccountId, propertyType, title, address, valuation } = req.body;
  
  if (!ownerAccountId || !propertyType || !title || !address || !valuation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (valuation < 0 || valuation > 1000000000) {
    return res.status(400).json({ error: 'Invalid valuation' });
  }
  
  // Sanitize inputs
  req.body.title = sanitize(title);
  req.body.address = sanitize(address);
  
  next();
};
```

### **8.4 Rate Limiting**

```javascript
// Production: Add rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests'
});

app.use('/api/v1', limiter);
```

### **8.5 Security Checklist**

**Implemented:**
- ✅ ZK proofs (privacy)
- ✅ Atomic transactions (consistency)
- ✅ Proof expiration (freshness)
- ✅ Re-verification (double-check)
- ✅ Ownership verification (fraud prevention)

**Production TODO:**
- 🔜 JWT authentication
- 🔜 HTTPS/TLS
- 🔜 Rate limiting
- 🔜 Input sanitization
- 🔜 DDoS protection
- 🔜 Security audit
- 🔜 Penetration testing

---

## 9. Performance & Scalability

### **9.1 Performance Metrics**

**API Response Times:**
```
Property List:        < 100ms
Property Details:     < 150ms
Proof Generation:     2-3 seconds
Proof Verification:   < 50ms
Offer Creation:       < 200ms
Settlement:           5-10 seconds (blockchain)
```

**Throughput:**
```
Concurrent Users:     1,000+
Properties:           10,000+
Proofs/Second:        50+
Offers/Second:        20+
```

### **9.2 Database Optimization**

**Indexes:**
```javascript
// Frequently queried fields
propertySchema.index({ status: 1, listedAt: -1 });
propertySchema.index({ price: 1, status: 1 });
proofSchema.index({ userIdentifier: 1, type: 1, expiresAt: 1 });
offerSchema.index({ propertyId: 1, status: 1 });
```

**Query Optimization:**
```javascript
// Use projections to limit returned fields
Property.find({ status: 'listed' })
  .select('propertyId title price location')
  .limit(20)
  .lean(); // Return plain objects (faster)
```

### **9.3 Caching Strategy**

**Redis Cache (Future):**
```javascript
// Cache frequently accessed data
const cachedProperty = await redis.get(`property:${propertyId}`);
if (cachedProperty) return JSON.parse(cachedProperty);

const property = await Property.findOne({ propertyId });
await redis.setex(`property:${propertyId}`, 300, JSON.stringify(property));
```

### **9.4 Scalability Plan**

**Horizontal Scaling:**
```
Load Balancer
    ↓
┌────────┬────────┬────────┐
│ Node 1 │ Node 2 │ Node 3 │
└────────┴────────┴────────┘
         ↓
    MongoDB Replica Set
         ↓
    Miden Blockchain
```

**Microservices (Future):**
```
API Gateway
    ↓
┌─────────────┬──────────────┬──────────────┐
│ Property    │ Proof        │ Settlement   │
│ Service     │ Service      │ Service      │
└─────────────┴──────────────┴──────────────┘
         ↓
    Shared Database / Event Bus
```

---

## 10. Deployment Architecture

### **10.1 Development Environment**

```yaml
Node.js Backend:
  Host: localhost
  Port: 5000
  
Rust Service:
  Host: localhost
  Port: 3000
  
MongoDB:
  Host: localhost
  Port: 27017
  
Miden Client:
  Network: Testnet
```

### **10.2 Production Environment**

```yaml
Infrastructure:
  Cloud: AWS / GCP / Azure
  Containers: Docker
  Orchestration: Kubernetes
  
Services:
  API: ECS/GKE (Auto-scaling)
  Database: MongoDB Atlas (M30+)
  Cache: Redis ElastiCache
  CDN: CloudFront
  
Monitoring:
  APM: Datadog / New Relic
  Logging: ELK Stack
  Alerts: PagerDuty
```

### **10.3 Docker Configuration**

```dockerfile
# Node.js Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]

# Rust Service
FROM rust:1.70
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release
COPY src ./src
RUN cargo build --release
EXPOSE 3000
CMD ["./target/release/miden-service"]
```

### **10.4 CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm test
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: docker build -t obscura-backend .
      - run: docker push obscura-backend:latest
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: kubectl set image deployment/obscura backend=obscura-backend:latest
```

---

## 11. Appendix

### **11.1 Glossary**

- **STARK:** Scalable Transparent Argument of Knowledge
- **MASM:** Miden Assembly
- **ZK Proof:** Zero-Knowledge Proof
- **NFT:** Non-Fungible Token
- **ACID:** Atomicity, Consistency, Isolation, Durability

### **11.2 References**

- Polygon Miden Documentation: https://docs.polygon.technology/miden/
- STARK Proofs: https://eprint.iacr.org/2018/046
- MongoDB Transactions: https://docs.mongodb.com/manual/core/transactions/

---

**Document Version:** 1.0  
**Last Updated:** December 2024  