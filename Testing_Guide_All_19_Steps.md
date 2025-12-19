# Obscura × Miden  
## End-to-End Execution Flow (A–Z)

This document describes the complete **19-step execution lifecycle** of the Obscura privacy-first real estate platform built on **Miden**, **Zero-Knowledge Proofs**, **encrypted notes**, and **atomic settlement**.

It explains **what happens, why it happens, and how each layer interacts**, from wallet connection to final settlement.

---

## 1. High-Level Architecture

### Core Components

- **Frontend (React / Vite)**
  - Wallet connection
  - Proof generation triggers
  - Property & offer UI
- **Backend (Node.js)**
  - Orchestration layer
  - Compliance enforcement
  - Encryption & access control
- **ZK Proof Layer**
  - Accreditation proofs
  - Jurisdiction proofs
- **Miden Blockchain**
  - Private property notes
  - Escrow accounts
  - Atomic settlement
- **IPFS**
  - Encrypted property metadata
- **Encryption**
  - AES-256-GCM
  - Owner-controlled access

---

## 2. Actors

| Actor | Role |
|------|-----|
| Alice | Property owner / seller |
| Bob | Investor / buyer |
| Platform | Compliance & orchestration |
| Miden | Privacy-preserving settlement |

---

## 3. Step-by-Step Execution Flow

---

## STEP 1 — Alice Connects Wallet

Alice connects her wallet to the platform.

GET /get-account


**What happens**
- A Miden account is assigned to Alice
- Account ID becomes her on-chain identity
- No private data is exposed

---

## STEP 2 — Ownership Proof Generation (Pre-Mint)

Alice must prove ownership before minting a property.

POST /api/v1/proofs/generate-ownership



**What happens**
- Alice submits ownership documents
- Platform generates an ownership proof
- Proof is timestamped and expiry-bound
- Proof ID is saved for mint authorization

**Why**
This prevents fraudulent or unauthorized property minting.

---

## STEP 3 — Property Minting as a Private Miden Note

Alice mints her property as an encrypted on-chain asset.

POST /api/v1/properties/mint-encrypted


**What happens**
- Property metadata is encrypted (AES-256-GCM)
- Encrypted data is stored on IPFS
- A private Miden note is created
- Ownership note is consumed into Alice’s vault
- Decryption key is generated for Alice only

**Result**
- Property exists on-chain
- Metadata is unreadable to the public

---

## STEP 4 — Alice Views Her Minted Property

GET /api/v1/properties/my-properties



**What happens**
- Platform verifies Alice as the owner
- Encrypted metadata is decrypted
- Full property details are shown only to Alice

⚠️ **Important**
Decryption must be gated by wallet ownership or ownership proof validation.

---

## STEP 5 — Property Listing with Selective Disclosure

Alice lists the property with compliance rules.

POST /api/v1/properties/list



**Disclosure Rules**
- Valuation → Accredited investors only
- Address & documents → Verified users only
- Restricted countries enforced

**Why**
This enables privacy-preserving marketplaces instead of public data exposure.

---

## STEP 6 — Bob Connects Wallet

Bob connects his wallet and receives a Miden account.

GET /get-account



No personal identity data is shared.

---

## STEP 7 — Bob Views Anonymized Listings

GET /api/v1/properties/available



**What Bob sees**
- Basic property info
- Encrypted location
- Locked full details
- Compliance requirements

---

## STEP 8 — Accreditation Proof (ZK)

Bob proves financial eligibility without revealing net worth.

POST /api/v1/proofs/generate-accreditation



**What happens**
- Client generates ZK proof
- Platform verifies threshold condition
- Proof is stored with expiry

---

## STEP 9 — Jurisdiction Proof (ZK)

Bob proves he is not from a restricted country.

POST /api/v1/proofs/generate-jurisdiction



**What happens**
- Jurisdiction constraint verified via ZK
- No country data is revealed
- Proof validity recorded

---

## STEP 10 — Unlock Full Property Details

GET /api/v1/properties/{propertyId}/details



**What happens**
- Platform checks accreditation & jurisdiction proofs
- Encrypted IPFS data is decrypted
- Bob receives full property details

⚠️ Decryption occurs **only after compliance verification**.

---

## STEP 11 — Bob Submits Purchase Offer

### Eligibility Check
GET /api/v1/offers/check-eligibility



### Offer Creation
POST /api/v1/offers/create


**What happens**
- Compliance is re-verified
- Offer is created with expiry
- No funds are moved yet

---

## STEP 12 — Alice Accepts Offer

POST /api/v1/offers/{offerId}/accept



**What happens**
- Escrow account is created on Miden
- Buyer funds are locked
- Offer status changes to `accepted`

---

## STEP 13 — Settlement Readiness Check (Alice)

GET /api/v1/settlement/{offerId}/check-ready



**Checks**
- Offer accepted
- Escrow funded
- Proofs valid
- Property still owned by Alice

---

## STEP 14 — Settlement Readiness Check (Bob)

Bob independently verifies the same readiness conditions.

**Why**
Trust minimization — both parties verify independently.

---

## STEP 15 — Platform Compliance Verification

Platform performs final checks:
- Proof expiry
- Escrow integrity
- Ownership validity
- Property availability

---

## STEP 16 — Atomic Settlement Execution

POST /api/v1/settlement/{offerId}/execute



**Atomic Actions**
1. Ownership note transferred to Bob
2. Escrow funds released to Alice
3. Property marked as sold

**Guarantee**
Either everything succeeds, or nothing does.

---

## STEP 17 — Public Proof Generation Events

Anyone can view:
- Proof creation timestamps
- Proof types
- Verification status

Proof contents remain private.

---

## STEP 18 — Public Proof Verification Status

Proofs can be checked as:
- Valid
- Expired
- Revoked

Without revealing sensitive data.

---

## STEP 19 — Private Proof Dashboard

GET /api/v1/proofs/my-proofs



**Users can see**
- Their proof history
- Expiry timelines
- Verification status

---

## 4. Security & Privacy Guarantees

- No public property documents
- No public investor identity
- No net-worth disclosure
- Compliance without surveillance
- Atomic settlement without trust

---

## 5. Summary

This flow demonstrates how real-world assets can be:
- Tokenized privately
- Sold compliantly
- Settled trustlessly

Using **Miden + ZK + encryption**, without sacrificing user privacy.

---

