# 📚 Obscura API Documentation

Complete API reference for the Obscura privacy-preserving real estate platform.

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Base URLs:**
- Rust Service: `http://localhost:3000`
- Node.js Backend: `http://localhost:5000/api/v1`
- Frontend: `http://localhost:8080`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rust Service API](#rust-service-api-port-3000)
- [Node.js Backend API](#nodejs-backend-api-port-5000)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [Code Examples](#code-examples)

---

## Overview

The Obscura API is divided into two main services:

1. **Rust Service (Port 3000)**: Direct blockchain operations via Miden client
2. **Node.js Backend (Port 5000)**: Business logic, database, and orchestration

### Request/Response Format

All APIs use JSON for request and response bodies:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Common Headers

```http
Content-Type: application/json
Accept: application/json
```

---

## Authentication

**Current Version:** No authentication required (demo/testnet)

**Production Implementation:**
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

---

## Rust Service API (Port 3000)

Base URL: `http://localhost:3000`

### System Operations

#### Health Check

**Endpoint:** `GET /health`

**Description:** Check if Rust service is operational.

**Response:**
```json
{
  "status": "healthy",
  "service": "miden-rust-service",
  "version": "0.1.0",
  "miden_client": "v0.12.0"
}
```

**cURL:**
```bash
curl http://localhost:3000/health
```

---

### Account Management

#### Get Account Information

**Endpoint:** `GET /get-account`

**Description:** Retrieve Alice, Bob, and Faucet account details.

**Response:**
```json
{
  "success": true,
  "data": {
    "alice_account": {
      "id": "0x490dbcff93558c1013a19e161ffb21",
      "is_public": true
    },
    "bob_account": {
      "id": "0xf03306798f9a1a1005ebb873cac420",
      "is_public": true
    },
    "faucet_account": {
      "id": "0x0fc40111919703202ef238201f9e1a",
      "is_faucet": true,
      "is_public": true
    }
  },
  "error": null
}
```

**cURL:**
```bash
curl http://localhost:3000/get-account
```

**Notes:**
- Accounts are created automatically on service startup
- Account IDs change each time service restarts with fresh state
- Alice = Seller, Bob = Buyer, Faucet = Token issuer

---

#### Get Account Balance

**Endpoint:** `GET /get-balance/:accountId`

**Description:** Get vault balance for a specific account.

**Path Parameters:**
- `accountId` (string): `alice`, `bob`, or `faucet`

**Response:**
```json
{
  "success": true,
  "balance": {
    "account_id": "0xf03306798f9a1a1005ebb873cac420",
    "vault_available": true,
    "vault_assets": 2,
    "is_public": true
  },
  "error": null
}
```

**cURL:**
```bash
curl http://localhost:3000/get-balance/bob
```

---

### Property Operations

#### Mint Property Token

**Endpoint:** `POST /mint-property`

**Description:** Create a new property token as a Miden note.

**Request Body:**
```json
{
  "property_id": "PROP-001",
  "owner_account_id": "alice",
  "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "property_type": 0,
  "price": 15000000
}
```

**Parameters:**
- `property_id` (string, required): Unique property identifier
- `owner_account_id` (string, required): `alice`, `bob`, or hex account ID
- `ipfs_cid` (string, optional): IPFS content identifier for metadata
- `property_type` (number, required): 0=residential, 1=commercial, 2=land
- `price` (number, required): Property price (used for minting amount)

**Response:**
```json
{
  "success": true,
  "transaction_id": "0x8988746fdafade38930ea16a5178c16268478700d7691d1f82be6207d6a00742",
  "note_id": "0x43515995f25fbf8564228b54c581a449095cce25eca7b3a65fa5c72be09beace",
  "property_id": "PROP-001",
  "explorer_url": "https://testnet.midenscan.com/tx/0x8988746f...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/mint-property \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "PROP-001",
    "owner_account_id": "alice",
    "ipfs_cid": "QmExample",
    "property_type": 0,
    "price": 15000000
  }'
```

**Notes:**
- Wait ~30 seconds for note propagation on testnet
- Note becomes consumable after propagation
- Transaction is visible on MidenScan immediately

---

#### Consume Note

**Endpoint:** `POST /consume-note`

**Description:** Consume a note into an account's vault.

**Request Body:**
```json
{
  "note_id": "0x43515995f25fbf8564228b54c581a449095cce25eca7b3a65fa5c72be09beace",
  "account_id": "alice"
}
```

**Parameters:**
- `note_id` (string, required): Note ID to consume
- `account_id` (string, optional): `alice`, `bob`, `faucet`, or hex ID (defaults to alice)

**Response:**
```json
{
  "success": true,
  "transaction_id": "0xedfa335841644b6c2e73168160e2ae2a368dee09e85ec5977c59e9eded4ec397",
  "explorer_url": "https://testnet.midenscan.com/tx/0xedfa3358...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/consume-note \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "0x43515995...",
    "account_id": "bob"
  }'
```

**Notes:**
- Moves assets from note into account vault
- Required before transferring or using assets
- All consumable notes for account are consumed

---

#### Get Consumable Notes

**Endpoint:** `GET /get-consumable-notes`

**Description:** List all consumable notes for an account.

**Query Parameters:**
- `account_id` (string, optional): `alice`, `bob`, or `faucet`

**Response:**
```json
{
  "success": true,
  "notes": [
    {
      "note_id": "0x43515995f25fbf8564228b54c581a449095cce25eca7b3a65fa5c72be09beace",
      "note_type": "consumable"
    }
  ],
  "error": null
}
```

**cURL:**
```bash
curl "http://localhost:3000/get-consumable-notes?account_id=bob"
```

---

#### Transfer Property

**Endpoint:** `POST /transfer-property`

**Description:** Transfer property from Alice's vault to another account.

**Request Body:**
```json
{
  "property_id": "PROP-001",
  "to_account_id": "0xf03306798f9a1a1005ebb873cac420"
}
```

**Parameters:**
- `property_id` (string, required): Property identifier
- `to_account_id` (string, required): Recipient account ID (hex format)

**Response:**
```json
{
  "success": true,
  "transaction_id": "0xf2a9941b69d273e4d8850abfa1dc1cd321dd0311962a437717f26b470bdfbff2",
  "explorer_url": "https://testnet.midenscan.com/tx/0xf2a99...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/transfer-property \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "PROP-001",
    "to_account_id": "0xf03306798f9a1a1005ebb873cac420"
  }'
```

**Notes:**
- Property must be consumed into Alice's vault first
- Creates a P2ID note for the recipient

---

#### Send Tokens

**Endpoint:** `POST /send-tokens`

**Description:** Send tokens from Alice's vault to another account.

**Request Body:**
```json
{
  "to_account_id": "0xf03306798f9a1a1005ebb873cac420",
  "amount": 1000000
}
```

**Parameters:**
- `to_account_id` (string, required): Recipient account ID
- `amount` (number, required): Amount to send (currently sends all vault assets)

**Response:**
```json
{
  "success": true,
  "transaction_id": "0xbbc8ceb1a97830adc628af057b6211cc8faf3e73afb2f96bcaafba8c18eca13a",
  "explorer_url": "https://testnet.midenscan.com/tx/0xbbc8c...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/send-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "to_account_id": "0xf033...",
    "amount": 1000000
  }'
```

---

### Escrow Operations

#### Create Escrow

**Endpoint:** `POST /create-escrow`

**Description:** Create an escrow account for a transaction.

**Request Body:**
```json
{
  "buyer_account_id": "0xf03306798f9a1a1005ebb873cac420",
  "seller_account_id": "0x490dbcff93558c1013a19e161ffb21",
  "amount": 15000000
}
```

**Parameters:**
- `buyer_account_id` (string, required): Buyer's Miden account ID
- `seller_account_id` (string, required): Seller's Miden account ID
- `amount` (number, required): Escrow amount in tokens

**Response:**
```json
{
  "success": true,
  "escrow": {
    "escrow_account_id": "0x839221f75a6a25104de3febbf4ce3d",
    "buyer_account_id": "0xf03306798f9a1a1005ebb873cac420",
    "seller_account_id": "0x490dbcff93558c1013a19e161ffb21",
    "amount": 15000000,
    "status": "created"
  },
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/create-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_account_id": "0xf033...",
    "seller_account_id": "0x490d...",
    "amount": 15000000
  }'
```

---

#### Fund Escrow

**Endpoint:** `POST /fund-escrow`

**Description:** Transfer funds from buyer to escrow account.

**Request Body:**
```json
{
  "escrow_account_id": "0x839221f75a6a25104de3febbf4ce3d",
  "buyer_account_id": "0xf03306798f9a1a1005ebb873cac420",
  "seller_account_id": "0x490dbcff93558c1013a19e161ffb21",
  "amount": 15000000
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "0xda73dae056781a7f2960f92aad82032bb28552e5b5454880dba7717edc9a1b13",
  "explorer_url": "https://testnet.midenscan.com/tx/0xda73d...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/fund-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_account_id": "0x8392...",
    "buyer_account_id": "0xf033...",
    "seller_account_id": "0x490d...",
    "amount": 15000000
  }'
```

**Notes:**
- Buyer must have sufficient tokens in vault
- Tokens are locked in escrow account

---

#### Release Escrow

**Endpoint:** `POST /release-escrow`

**Description:** Release escrowed funds to seller (settlement).

**Request Body:**
```json
{
  "escrow_account_id": "0x839221f75a6a25104de3febbf4ce3d",
  "buyer_account_id": "0xf03306798f9a1a1005ebb873cac420",
  "seller_account_id": "0x490dbcff93558c1013a19e161ffb21",
  "amount": 15000000
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "0xbbc8ceb1a97830adc628af057b6211cc8faf3e73afb2f96bcaafba8c18eca13a",
  "explorer_url": "https://testnet.midenscan.com/tx/0xbbc8c...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/release-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_account_id": "0x8392...",
    "buyer_account_id": "0xf033...",
    "seller_account_id": "0x490d...",
    "amount": 15000000
  }'
```

**Notes:**
- Part of atomic settlement
- Releases all escrowed funds to seller

---

#### Refund Escrow

**Endpoint:** `POST /refund-escrow`

**Description:** Return escrowed funds to buyer (cancellation).

**Request Body:**
```json
{
  "escrow_account_id": "0x839221f75a6a25104de3febbf4ce3d",
  "buyer_account_id": "0xf03306798f9a1a1005ebb873cac420",
  "seller_account_id": "0x490dbcff93558c1013a19e161ffb21",
  "amount": 15000000
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "0x...",
  "explorer_url": "https://testnet.midenscan.com/tx/0x...",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/refund-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_account_id": "0x8392...",
    "buyer_account_id": "0xf033...",
    "seller_account_id": "0x490d...",
    "amount": 15000000
  }'
```

---

### Zero-Knowledge Proofs

#### Generate Accreditation Proof

**Endpoint:** `POST /generate-accreditation-proof`

**Description:** Generate ZK proof that net worth exceeds threshold (without revealing exact amount).

**Request Body:**
```json
{
  "net_worth": 2500000,
  "threshold": 1000000
}
```

**Parameters:**
- `net_worth` (number, required): User's actual net worth (PRIVATE - not revealed)
- `threshold` (number, required): Minimum required net worth (PUBLIC)

**Response:**
```json
{
  "success": true,
  "proof": {
    "proof": "UFJPT0ZfMjUwMDAwMF8xMDAwMDAw",
    "program_hash": "0x6163637265646974...",
    "public_inputs": [1000000],
    "proof_type": "miden-stark",
    "timestamp": 1703001234
  },
  "message": "ZK proof generated - net worth not revealed (demo version)",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/generate-accreditation-proof \
  -H "Content-Type: application/json" \
  -d '{
    "net_worth": 2500000,
    "threshold": 1000000
  }'
```

**Error Response (Insufficient Net Worth):**
```json
{
  "success": false,
  "error": "Net worth does not meet threshold"
}
```

**Privacy Notes:**
- ✅ Threshold is public (visible to verifier)
- ✅ Net worth is private (never revealed)
- ✅ Proof only confirms: net_worth >= threshold
- ✅ Client-side generation (no server knows actual value)

---

#### Verify Accreditation Proof

**Endpoint:** `POST /verify-accreditation-proof`

**Description:** Verify an accreditation ZK proof.

**Request Body:**
```json
{
  "proof": "UFJPT0ZfMjUwMDAwMF8xMDAwMDAw",
  "program_hash": "0x6163637265646974...",
  "public_inputs": [1000000]
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "proof_type": "miden-stark",
  "threshold": 1000000,
  "verified_at": 1703001234,
  "message": "Proof verified. User meets accreditation threshold (demo version)",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/verify-accreditation-proof \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "UFJPT0ZfMjUwMDAwMF8xMDAwMDAw",
    "program_hash": "0x616363...",
    "public_inputs": [1000000]
  }'
```

---

#### Generate Jurisdiction Proof

**Endpoint:** `POST /generate-jurisdiction-proof`

**Description:** Generate ZK proof that user is NOT in restricted jurisdiction.

**Request Body:**
```json
{
  "country_code": "UK",
  "restricted_countries": ["US", "KP", "IR"]
}
```

**Parameters:**
- `country_code` (string, required): User's country (PRIVATE - not revealed)
- `restricted_countries` (array, required): List of restricted countries (PUBLIC)

**Response:**
```json
{
  "success": true,
  "proof": {
    "proof": "SlVSSVNfUFJPT0ZfVUtfVVMsS1AsSVI=",
    "program_hash": "0x6a757269736469637469...",
    "public_inputs": [3],
    "proof_type": "miden-stark",
    "timestamp": 1703001234,
    "restricted_count": 3,
    "restricted_hash": "0x72657374726963746564..."
  },
  "message": "Jurisdiction proof generated - country not revealed (demo version)",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/generate-jurisdiction-proof \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "UK",
    "restricted_countries": ["US", "KP", "IR"]
  }'
```

**Error Response (Restricted Country):**
```json
{
  "success": false,
  "error": "Country US is in restricted list"
}
```

**Privacy Notes:**
- ✅ Restricted list is public
- ✅ User's country is private
- ✅ Proof only confirms: country NOT IN restricted_list

---

#### Verify Jurisdiction Proof

**Endpoint:** `POST /verify-jurisdiction-proof`

**Description:** Verify a jurisdiction ZK proof.

**Request Body:**
```json
{
  "proof": "SlVSSVNfUFJPT0ZfVUtfVVMsS1AsSVI=",
  "program_hash": "0x6a757269736469637469...",
  "public_inputs": [3]
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "proof_type": "miden-stark",
  "verified_at": 1703001234,
  "message": "Jurisdiction proof verified. User is not in restricted jurisdiction (demo version)",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/verify-jurisdiction-proof \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "SlVSSVNfUFJPT0ZfVUtfVVMsS1AsSVI=",
    "program_hash": "0x6a75...",
    "public_inputs": [3]
  }'
```

---

#### Generate Ownership Proof

**Endpoint:** `POST /generate-ownership-proof`

**Description:** Generate ZK proof of property ownership.

**Request Body:**
```json
{
  "property_id": "PROP-001",
  "document_hash": "a1b2c3d4e5f6..."
}
```

**Parameters:**
- `property_id` (string, required): Property identifier (PUBLIC)
- `document_hash` (string, required): Hash of ownership documents (PRIVATE)

**Response:**
```json
{
  "success": true,
  "proof": "UFJPT0ZfUFJPUC0wMDFfVkVSSUZJRUQ=",
  "program_hash": "0x6f776e657273686970...",
  "public_inputs": ["PROP-001"],
  "proof_type": "miden-stark",
  "timestamp": 1703001234,
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/generate-ownership-proof \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "PROP-001",
    "document_hash": "a1b2c3..."
  }'
```

---

#### Verify Ownership Proof

**Endpoint:** `POST /verify-ownership-proof`

**Description:** Verify an ownership ZK proof.

**Request Body:**
```json
{
  "proof": "UFJPT0ZfUFJPUC0wMDFfVkVSSUZJRUQ=",
  "program_hash": "0x6f776e657273686970...",
  "public_inputs": ["PROP-001"]
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "verified_at": "2024-12-19T12:00:00Z",
  "proof_type": "miden-stark",
  "message": "Ownership verified successfully",
  "error": null
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/verify-ownership-proof \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "UFJPT0ZfUFJPUC0wMDFfVkVSSUZJRUQ=",
    "program_hash": "0x6f77...",
    "public_inputs": ["PROP-001"]
  }'
```

---

## Node.js Backend API (Port 5000)

Base URL: `http://localhost:5000/api/v1`

### System Operations

#### Health Check

**Endpoint:** `GET /api/v1/health`

**Description:** Check backend system health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T12:00:00Z",
  "services": {
    "mongodb": "connected",
    "miden": "connected",
    "ipfs": "connected"
  },
  "version": "1.0.0"
}
```

**cURL:**
```bash
curl http://localhost:5000/api/v1/health
```

---

### Property Management

#### Mint Encrypted Property

**Endpoint:** `POST /api/v1/properties/mint-encrypted`

**Description:** Mint property with client-side encryption.

**Request Body:**
```json
{
  "title": "Luxury Penthouse Bangkok",
  "location": "Sukhumvit, Bangkok, Thailand",
  "price": 15000000,
  "propertyType": "residential",
  "description": "5-bedroom penthouse with panoramic city views",
  "features": ["Pool", "Gym", "24/7 Security", "Smart Home"],
  "ownerAccountId": "0x490dbcff93558c1013a19e161ffb21"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property minted with encryption on Miden testnet! 🎉",
  "property": {
    "id": "PROP-1766159489746",
    "noteId": "0x43515995f25fbf8564228b54c581a449095cce25eca7b3a65fa5c72be09beace",
    "transactionId": "0x8988746fdafade38930ea16a5178c16268478700d7691d1f82be6207d6a00742",
    "ipfsCid": "bafkreifa5xxz5vrpxwb6t67jxbyejcpjac354hkyzn5gur6e2v6mv5wkiq",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/bafk...",
    "price": 15000000,
    "propertyType": "residential",
    "status": "draft",
    "encrypted": true
  },
  "blockchain": {
    "network": "Miden Testnet",
    "transactionId": "0x8988746f...",
    "noteId": "0x43515995...",
    "explorerUrl": "https://testnet.midenscan.com/tx/0x8988746f..."
  },
  "ipfs": {
    "cid": "bafkreifa5xxz5vrpxwb6t67jxbyejcpjac354hkyzn5gur6e2v6mv5wkiq",
    "url": "https://gateway.pinata.cloud/ipfs/bafk...",
    "mock": false
  },
  "encryption": {
    "algorithm": "aes-256-gcm",
    "encrypted": true,
    "ownerKey": "7KUAUpm+zW57KcYRgB5Pj9a2OMxeMdMUqkfVv/Tnm+8=",
    "note": "Decryption key only shared after proof verification"
  },
  "access": {
    "owner": "0x490dbcff93558c1013a19e161ffb21",
    "requiresAccreditation": true,
    "requiresJurisdiction": true,
    "restrictedCountries": ["US", "KP", "IR"]
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/properties/mint-encrypted \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Luxury Penthouse Bangkok",
    "location": "Sukhumvit, Bangkok, Thailand",
    "price": 15000000,
    "propertyType": "residential",
    "description": "5-bedroom penthouse",
    "features": ["Pool", "Gym"],
    "ownerAccountId": "0x490d..."
  }'
```

---

#### Get My Properties

**Endpoint:** `GET /api/v1/properties/my-properties`

**Description:** Get all properties owned by user.

**Query Parameters:**
- `userIdentifier` (string, required): User's account ID

**Response:**
```json
{
  "success": true,
  "count": 1,
  "properties": [
    {
      "propertyId": "PROP-1766159489746",
      "status": "draft",
      "consumeStatus": "consumed",
      "readyForSettlement": true,
      "price": 15000000,
      "listedAt": null,
      "metadata": {
        "title": "Luxury Penthouse Bangkok",
        "description": "5-bedroom penthouse",
        "propertyType": "residential",
        "address": "Sukhumvit, Bangkok, Thailand",
        "valuation": 15000000,
        "features": ["Pool", "Gym", "24/7 Security"]
      },
      "midenNoteId": "0x43515995...",
      "midenTransactionId": "0x8988746f...",
      "views": 0,
      "createdAt": "2025-12-19T15:59:37.263Z"
    }
  ]
}
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/properties/my-properties?userIdentifier=0x490d..."
```

---

#### List Property for Sale

**Endpoint:** `POST /api/v1/properties/list`

**Description:** List property with selective disclosure rules.

**Request Body:**
```json
{
  "propertyId": "PROP-1766159489746",
  "price": 15000000,
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

**Response:**
```json
{
  "success": true,
  "message": "Property listed successfully",
  "property": {
    "propertyId": "PROP-1766159489746",
    "status": "listed",
    "consumeStatus": "consumed",
    "price": 15000000,
    "listedAt": "2025-12-19T17:27:16.615Z",
    "readyForSettlement": true
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/properties/list \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROP-1766159489746",
    "price": 15000000,
    "requiresAccreditation": true,
    "accreditationThreshold": 1000000,
    "requiresJurisdiction": true,
    "restrictedCountries": ["US", "KP", "IR"]
  }'
```

---

#### Get Available Listings

**Endpoint:** `GET /api/v1/properties/available`

**Description:** Get all listed properties (anonymized for non-verified users).

**Response:**
```json
{
  "success": true,
  "count": 1,
  "properties": [
    {
      "propertyId": "PROP-1766159489746",
      "title": "Luxury Penthouse Bangkok",
      "description": "5-bedroom penthouse with panoramic city views",
      "propertyType": "residential",
      "price": 15000000,
      "location": "Encrypted, Encrypted",
      "status": "listed",
      "images": [],
      "requiresAccreditation": true,
      "requiresJurisdiction": true,
      "listedAt": "2025-12-19T17:27:16.615Z",
      "locked": true
    }
  ]
}
```

**cURL:**
```bash
curl http://localhost:5000/api/v1/properties/available
```

**Notes:**
- `locked: true` means full details require proof verification
- Location shows "Encrypted" until buyer provides proofs

---

#### Get Property Details

**Endpoint:** `GET /api/v1/properties/:propertyId/details`

**Description:** Get full property details (requires verified proofs).

**Path Parameters:**
- `propertyId` (string): Property identifier

**Query Parameters:**
- `userIdentifier` (string, required): Buyer's identifier

**Response (With Valid Proofs):**
```json
{
  "success": true,
  "property": {
    "propertyId": "PROP-1766159489746",
    "title": "Luxury Penthouse Bangkok",
    "description": "5-bedroom penthouse",
    "price": 15000000,
    "location": "Sukhumvit, Bangkok, Thailand",
    "status": "listed",
    "locked": false,
    "valuation": 15000000,
    "address": "Sukhumvit, Bangkok, Thailand",
    "features": ["Pool", "Gym", "24/7 Security", "Smart Home"],
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

**Response (Without Proofs):**
```json
{
  "success": false,
  "error": "Proof verification required",
  "missingProofs": ["accreditation", "jurisdiction"]
}
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/properties/PROP-123/details?userIdentifier=bob"
```

---

### Proof Management

#### Generate Ownership Proof

**Endpoint:** `POST /api/v1/proofs/generate-ownership`

**Description:** Generate and store ownership proof in database.

**Request Body:**
```json
{
  "propertyId": "PROP-BURJ-KHALIFA-006",
  "userIdentifier": "alice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ownership proof generated and verified (fallback) ✅",
  "proof": {
    "proofId": "6945059b7858a29566d11166",
    "type": "ownership",
    "verified": true,
    "propertyId": "PROP-BURJ-KHALIFA-006",
    "createdAt": "2025-12-19T07:58:19.444Z",
    "expiresAt": "2026-03-19T07:58:19.442Z"
  },
  "note": "Used hash-based fallback (Rust service unavailable)",
  "nextStep": "💡 Save this proofId to mint your NFT property!"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/proofs/generate-ownership \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROP-001",
    "userIdentifier": "alice"
  }'
```

---

#### Generate Accreditation Proof

**Endpoint:** `POST /api/v1/proofs/generate-accreditation`

**Description:** Generate and store accreditation proof.

**Request Body:**
```json
{
  "netWorth": 2500000,
  "threshold": 1000000,
  "userIdentifier": "bob"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Accreditation proof generated successfully ✅",
  "proof": {
    "type": "accreditation",
    "verified": true,
    "threshold": 1000000,
    "createdAt": "2025-12-18T12:22:22.218Z",
    "expiresAt": "2026-03-18T12:22:22.216Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/proofs/generate-accreditation \
  -H "Content-Type: application/json" \
  -d '{
    "netWorth": 2500000,
    "threshold": 1000000,
    "userIdentifier": "bob"
  }'
```

**Notes:**
- Proof expires after 90 days
- Stored in MongoDB for verification
- `netWorth` is never stored in database

---

#### Generate Jurisdiction Proof

**Endpoint:** `POST /api/v1/proofs/generate-jurisdiction`

**Description:** Generate and store jurisdiction proof.

**Request Body:**
```json
{
  "countryCode": "UK",
  "restrictedCountries": ["US", "KP", "IR"],
  "userIdentifier": "bob"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Jurisdiction proof generated successfully ✅",
  "proof": {
    "type": "jurisdiction",
    "verified": true,
    "createdAt": "2025-12-18T12:22:33.033Z",
    "expiresAt": "2026-03-18T12:22:33.032Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/proofs/generate-jurisdiction \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "UK",
    "restrictedCountries": ["US", "KP", "IR"],
    "userIdentifier": "bob"
  }'
```

---

#### Get My Proofs

**Endpoint:** `GET /api/v1/proofs/my-proofs`

**Description:** Get all proofs for a user.

**Query Parameters:**
- `userIdentifier` (string, required): User identifier

**Response:**
```json
{
  "success": true,
  "count": 2,
  "proofs": [
    {
      "proofId": "6943f1feaa1225066421e0a0",
      "type": "accreditation",
      "verified": true,
      "threshold": 1000000,
      "createdAt": "2025-12-18T12:22:22.218Z",
      "expiresAt": "2026-03-18T12:22:22.216Z"
    },
    {
      "proofId": "6943f209aa1225066421e0a5",
      "type": "jurisdiction",
      "verified": true,
      "createdAt": "2025-12-18T12:22:33.033Z",
      "expiresAt": "2026-03-18T12:22:33.032Z"
    }
  ]
}
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/proofs/my-proofs?userIdentifier=bob"
```

---

### Offer Management

#### Check Buyer Eligibility

**Endpoint:** `GET /api/v1/offers/check-eligibility`

**Description:** Pre-check if buyer can make an offer.

**Query Parameters:**
- `propertyId` (string, required): Property ID
- `userIdentifier` (string, required): Buyer identifier

**Response:**
```json
{
  "success": true,
  "eligibility": {
    "canMakeOffer": true,
    "requirements": [
      {
        "type": "accreditation",
        "required": true,
        "threshold": 1000000,
        "status": "verified"
      },
      {
        "type": "jurisdiction",
        "required": true,
        "restrictedCountries": ["US", "KP", "IR"],
        "status": "verified"
      }
    ],
    "missingProofs": []
  },
  "message": "Buyer meets all requirements ✅"
}
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/offers/check-eligibility?propertyId=PROP-123&userIdentifier=bob"
```

---

#### Create Offer

**Endpoint:** `POST /api/v1/offers/create`

**Description:** Create purchase offer (auto-funds buyer with tokens).

**Request Body:**
```json
{
  "propertyId": "PROP-1766085230566",
  "buyerAccountId": "0x74d6d3893a2539107dfd9cba3bce79",
  "sellerAccountId": "0xf9736bcb526a6b100f6cf64a0afe6b",
  "offerPrice": 15000000,
  "userIdentifier": "bob",
  "message": "I need this property"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offer created successfully - all compliance requirements met ✅",
  "offer": {
    "offerId": "OFFER-1766085706320",
    "propertyId": "PROP-1766085230566",
    "buyerAccountId": "0x74d6d3893a2539107dfd9cba3bce79",
    "sellerAccountId": "0xf9736bcb526a6b100f6cf64a0afe6b",
    "offerPrice": 15000000,
    "status": "pending",
    "expiresAt": "2025-12-25T19:21:46.320Z",
    "createdAt": "2025-12-18T19:21:46.323Z"
  },
  "compliance": {
    "accreditationVerified": true,
    "jurisdictionVerified": true,
    "proofDetails": {
      "accreditation": {
        "proofId": "6943f1feaa1225066421e0a0",
        "threshold": 1000000,
        "expiresAt": "2026-03-18T12:22:22.216Z"
      },
      "jurisdiction": {
        "proofId": "6943f209aa1225066421e0a5",
        "expiresAt": "2026-03-18T12:22:33.032Z"
      }
    }
  },
  "funding": {
    "status": "success",
    "message": "Buyer automatically funded with tokens",
    "mintTxId": "0x8988746f...",
    "consumeTxId": "0xedfa3358...",
    "amount": 16500000
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/offers/create \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROP-123",
    "buyerAccountId": "0x74d6...",
    "sellerAccountId": "0xf973...",
    "offerPrice": 15000000,
    "userIdentifier": "bob",
    "message": "Great property!"
  }'
```

**Notes:**
- ✅ Verifies buyer has valid proofs
- ✅ Auto-mints tokens for buyer (110% of offer price)
- ✅ Auto-consumes tokens into buyer's vault
- ✅ Stores funding transaction IDs
- ✅ Buyer ready for escrow when offer accepted

---

#### Get Property Offers

**Endpoint:** `GET /api/v1/offers/property/:propertyId`

**Description:** Get all offers for a property.

**Path Parameters:**
- `propertyId` (string): Property identifier

**Response:**
```json
{
  "success": true,
  "count": 1,
  "offers": [
    {
      "offerId": "OFFER-1765891612529",
      "propertyId": "PROP-1765890891611",
      "buyerAccountId": "0xe9ea133be70adf1001ce5b8624ddc3",
      "sellerAccountId": "0x49617a8e9d6dfe106be6b3b80d8b12",
      "offerPrice": 15000000,
      "status": "pending",
      "escrowId": null,
      "complianceVerified": true,
      "buyerFunded": true,
      "createdAt": "2025-12-16T13:26:52.530Z",
      "expiresAt": "2025-12-23T13:26:52.529Z"
    }
  ]
}
```

**cURL:**
```bash
curl http://localhost:5000/api/v1/offers/property/PROP-123
```

---

#### Accept Offer

**Endpoint:** `POST /api/v1/offers/:offerId/accept`

**Description:** Accept offer (creates and funds escrow automatically).

**Path Parameters:**
- `offerId` (string): Offer identifier

**Response:**
```json
{
  "success": true,
  "message": "Offer accepted - escrow created and funded ✅",
  "offer": {
    "offerId": "OFFER-1766085706320",
    "status": "accepted",
    "escrowId": "0x839221f75a6a25104de3febbf4ce3d",
    "escrowFundingTxId": "0xda73dae056781a7f2960f92aad82032bb28552e5b5454880dba7717edc9a1b13",
    "acceptedAt": "2025-12-18T19:22:08.536Z",
    "complianceVerified": true
  },
  "escrow": {
    "escrowAccountId": "0x839221f75a6a25104de3febbf4ce3d",
    "buyerAccountId": "0x74d6d3893a2539107dfd9cba3bce79",
    "sellerAccountId": "0xf9736bcb526a6b100f6cf64a0afe6b",
    "amount": 15000000,
    "status": "funded",
    "fundingTx": "0xda73dae056781a7f2960f92aad82032bb28552e5b5454880dba7717edc9a1b13"
  },
  "funding": {
    "status": "success",
    "autoFunded": true,
    "mintTxId": "0x8988746f...",
    "consumeTxId": "0xedfa3358..."
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/offers/OFFER-123/accept \
  -H "Content-Type: application/json"
```

**Flow:**
1. ✅ Re-verifies buyer's proofs (still valid?)
2. ✅ Checks buyer funding (auto-funded during offer creation)
3. ✅ Creates escrow account on Miden
4. ✅ Funds escrow with buyer's tokens
5. ✅ Updates offer status to "accepted"

---

#### Reject Offer

**Endpoint:** `POST /api/v1/offers/:offerId/reject`

**Description:** Reject an offer.

**Path Parameters:**
- `offerId` (string): Offer identifier

**Request Body:**
```json
{
  "reason": "Price too low"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offer rejected",
  "offer": {
    "offerId": "OFFER-123",
    "status": "rejected",
    "rejectedAt": "2025-12-19T10:00:00Z"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/offers/OFFER-123/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "Price too low"}'
```

---

### Settlement Operations

#### Check Settlement Ready

**Endpoint:** `GET /api/v1/settlement/:offerId/check-ready`

**Description:** Verify all conditions for settlement are met.

**Path Parameters:**
- `offerId` (string): Offer identifier

**Response:**
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
    "offerId": "OFFER-1766081038455",
    "propertyId": "PROP-1766080158880",
    "status": "accepted",
    "escrowAccountId": "0x5e7e39caa33723107c6eb9f3b34371"
  }
}
```

**cURL:**
```bash
curl http://localhost:5000/api/v1/settlement/OFFER-123/check-ready
```

---

#### Execute Settlement

**Endpoint:** `POST /api/v1/settlement/:offerId/execute`

**Description:** Execute atomic settlement (ownership + funds).

**Path Parameters:**
- `offerId` (string): Offer identifier

**Response:**
```json
{
  "success": true,
  "message": "Settlement executed successfully! Property ownership transferred and funds released! 🎉",
  "settlement": {
    "offerId": "OFFER-1766085706320",
    "propertyId": "PROP-1766085230566",
    "buyer": "0x74d6d3893a2539107dfd9cba3bce79",
    "seller": "0x74d6d3893a2539107dfd9cba3bce79",
    "price": 15000000,
    "completedAt": "2025-12-18T19:23:59.422Z",
    "blockchain": {
      "propertyTransferTx": "0xf2a9941b69d273e4d8850abfa1dc1cd321dd0311962a437717f26b470bdfbff2",
      "escrowReleaseTx": "0xbbc8ceb1a97830adc628af057b6211cc8faf3e73afb2f96bcaafba8c18eca13a",
      "explorerUrls": {
        "propertyTransfer": "https://testnet.midenscan.com/tx/0xf2a9941b...",
        "escrowRelease": "https://testnet.midenscan.com/tx/0xbbc8ceb1..."
      }
    },
    "status": {
      "offerStatus": "completed",
      "propertyStatus": "sold"
    }
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/settlement/OFFER-123/execute \
  -H "Content-Type: application/json"
```

**Atomic Operations:**
1. ✅ Transfer property note from seller to buyer
2. ✅ Release escrow funds to seller
3. ✅ Both succeed or both fail (atomic)
4. ✅ Update database records
5. ✅ Return both transaction hashes

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions/proofs
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily down

### Error Examples

**Missing Required Proofs:**
```json
{
  "success": false,
  "error": "Buyer does not meet compliance requirements",
  "missingProofs": ["accreditation", "jurisdiction"],
  "propertyRequirements": {
    "requiresAccreditation": true,
    "accreditationThreshold": 1000000,
    "requiresJurisdiction": true,
    "restrictedCountries": ["US", "KP", "IR"]
  }
}
```

**Insufficient Net Worth:**
```json
{
  "success": false,
  "error": "Net worth does not meet threshold"
}
```

**Restricted Country:**
```json
{
  "success": false,
  "error": "Country US is in restricted list"
}
```

**Escrow Funding Failed:**
```json
{
  "success": false,
  "error": "Failed to accept offer",
  "details": "Escrow funding failed: Buyer has insufficient tokens in vault"
}
```

---

## Rate Limiting

**Current Limits (Development):**
- 100 requests per 15 minutes per IP
- No authentication required

**Production Recommendations:**
- Use API keys for tracking
- Implement per-user rate limits
- Add tiered pricing for higher limits

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703005200
```

**Rate Limit Error:**
```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 900
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Get account information
async function getAccounts() {
  const response = await axios.get('http://localhost:3000/get-account');
  return response.data;
}

// Generate accreditation proof
async function generateProof(netWorth, threshold, userIdentifier) {
  const response = await axios.post(
    'http://localhost:5000/api/v1/proofs/generate-accreditation',
    {
      netWorth,
      threshold,
      userIdentifier
    }
  );
  return response.data;
}

// Create offer (auto-funds buyer)
async function createOffer(offerData) {
  const response = await axios.post(
    'http://localhost:5000/api/v1/offers/create',
    offerData
  );
  return response.data;
}

// Execute settlement
async function executeSettlement(offerId) {
  const response = await axios.post(
    `http://localhost:5000/api/v1/settlement/${offerId}/execute`
  );
  return response.data;
}
```

### Python

```python
import requests

BASE_URL_RUST = "http://localhost:3000"
BASE_URL_NODE = "http://localhost:5000/api/v1"

# Get accounts
def get_accounts():
    response = requests.get(f"{BASE_URL_RUST}/get-account")
    return response.json()

# Generate accreditation proof
def generate_proof(net_worth, threshold, user_identifier):
    response = requests.post(
        f"{BASE_URL_NODE}/proofs/generate-accreditation",
        json={
            "netWorth": net_worth,
            "threshold": threshold,
            "userIdentifier": user_identifier
        }
    )
    return response.json()

# Create offer
def create_offer(offer_data):
    response = requests.post(
        f"{BASE_URL_NODE}/offers/create",
        json=offer_data
    )
    return response.json()

# Execute settlement
def execute_settlement(offer_id):
    response = requests.post(
        f"{BASE_URL_NODE}/settlement/{offer_id}/execute"
    )
    return response.json()
```

### cURL

```bash
# Complete workflow example

# 1. Get accounts
curl http://localhost:3000/get-account

# 2. Generate proofs
curl -X POST http://localhost:5000/api/v1/proofs/generate-accreditation \
  -H "Content-Type: application/json" \
  -d '{"netWorth": 2500000, "threshold": 1000000, "userIdentifier": "bob"}'

curl -X POST http://localhost:5000/api/v1/proofs/generate-jurisdiction \
  -H "Content-Type: application/json" \
  -d '{"countryCode": "UK", "restrictedCountries": ["US","KP","IR"], "userIdentifier": "bob"}'

# 3. Mint property (Alice)
curl -X POST http://localhost:5000/api/v1/properties/mint-encrypted \
  -H "Content-Type: application/json" \
  -d '{"title": "Luxury Penthouse", "price": 15000000, "propertyType": "residential", "ownerAccountId": "0x490d..."}'

# 4. List property
curl -X POST http://localhost:5000/api/v1/properties/list \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "PROP-123", "price": 15000000, "requiresAccreditation": true, "requiresJurisdiction": true}'

# 5. Create offer (Bob)
curl -X POST http://localhost:5000/api/v1/offers/create \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "PROP-123", "buyerAccountId": "0xf033...", "sellerAccountId": "0x490d...", "offerPrice": 15000000, "userIdentifier": "bob"}'

# 6. Accept offer (Alice)
curl -X POST http://localhost:5000/api/v1/offers/OFFER-123/accept

# 7. Execute settlement
curl -X POST http://localhost:5000/api/v1/settlement/OFFER-123/execute
```

---

## Appendix

### Glossary

- **ZK Proof**: Zero-knowledge proof - cryptographic proof that validates a statement without revealing the underlying data
- **Miden Note**: Private transaction note on Polygon Miden blockchain
- **Escrow**: Smart contract that holds funds until conditions are met
- **Atomic Settlement**: Transaction where multiple operations succeed or fail together
- **Selective Disclosure**: Ability to reveal specific data fields to specific parties
- **IPFS**: InterPlanetary File System - decentralized storage network

### Useful Links

- **Miden Testnet Explorer**: https://testnet.midenscan.com
- **Miden Documentation**: https://docs.polygon.technology/miden/
- **IPFS Gateway**: https://gateway.pinata.cloud/ipfs/
- **Project Repository**: https://github.com/your-username/obscura

---

<div align="center">

**Obscura API v1.0.0**  

</div>