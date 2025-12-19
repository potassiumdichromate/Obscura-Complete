// src/client.rs
//
// Core Miden Client Integration
//
// This module provides a minimal wrapper around the Miden Rust client.
// It follows the official Miden tutorials and is designed as a foundation
// for further account, asset, and transaction logic.
//
// Reference:
// https://0xpolygonmiden.github.io/miden-docs/miden-tutorials/rust-client/counter_contract_tutorial.html

use anyhow::{Result, Context};
use std::{sync::Arc, path::PathBuf};

use miden_client::{
    Client,
    crypto::RpoRandomCoin,
    rpc::{Endpoint, TonicRpcClient},
    store::{sqlite_store::SqliteStore, StoreAuthenticator, Store},
    Felt,
};

use rand::Rng;
use tracing::{info, debug};

/// Thin wrapper around the Miden Rust client.
///
/// Responsibilities:
/// - Initialize RPC connection
/// - Initialize local store
/// - Seed cryptographic RNG
/// - Provide sync and placeholder methods for future extensions
pub struct MidenClientWrapper {
    client: Client<RpoRandomCoin>,
}

impl MidenClientWrapper {
    /// Initialize a new Miden client instance.
    ///
    /// This closely follows the official Miden Rust client tutorial:
    /// - Creates RPC client
    /// - Seeds randomness
    /// - Initializes SQLite-backed store
    /// - Wires up authenticator and execution options
    pub async fn new() -> Result<Self> {
        info!("Initializing Miden client");

        // ---------------------------------------------------------------------
        // RPC endpoint configuration
        // ---------------------------------------------------------------------
        let endpoint = Endpoint::new(
            "https".to_string(),
            "rpc.testnet.miden.io".to_string(),
            Some(443),
        );
        let timeout_ms = 10_000;

        // Build gRPC RPC client
        let rpc_api = Box::new(TonicRpcClient::new(endpoint, timeout_ms));

        // ---------------------------------------------------------------------
        // Cryptographic RNG initialization
        // ---------------------------------------------------------------------
        let mut seed_rng = rand::thread_rng();
        let coin_seed: [u64; 4] = seed_rng.gen();
        let rng = RpoRandomCoin::new(coin_seed.map(Felt::new));

        // ---------------------------------------------------------------------
        // Local persistent store (SQLite)
        // ---------------------------------------------------------------------
        let store_path = PathBuf::from("./miden-store.sqlite3");
        let store = SqliteStore::new(store_path)
            .await
            .context("Failed to create SQLite store")?;

        // Wrap store as Arc<dyn Store> as required by Client::new
        let store: Arc<dyn Store> = Arc::new(store);

        // ---------------------------------------------------------------------
        // Store-backed authenticator for transaction signing
        // ---------------------------------------------------------------------
        let authenticator = StoreAuthenticator::new_with_rng(
            store.clone(),
            rng.clone(),
        );

        // ---------------------------------------------------------------------
        // Client initialization
        // ---------------------------------------------------------------------
        // NOTE:
        // - Client::new() is synchronous (not async)
        // - It returns Client<R> directly (not Result)
        //
        // Signature based on:
        // https://github.com/0xMiden/miden-client/blob/main/crates/rust-client/src/lib.rs
        let client = Client::new(
            rpc_api,                 // RPC API client
            rng,                     // Random number generator
            store,                   // Storage backend
            Arc::new(authenticator), // Transaction authenticator
            Default::default(),      // Execution options
        );

        info!("Miden client initialized successfully");

        Ok(Self { client })
    }

    /// Sync local client state with the Miden network.
    ///
    /// This should be called before any operation that depends on:
    /// - account state
    /// - notes
    /// - assets
    pub async fn sync(&mut self) -> Result<()> {
        debug!("Syncing with Miden network");

        self.client
            .sync_state()
            .await
            .context("Failed to sync with network")?;

        info!("Client synced with network");
        Ok(())
    }

    /// Create a property NFT faucet account.
    ///
    /// This function is intentionally left unimplemented.
    /// It should follow the official faucet deployment tutorial:
    /// https://docs.miden.xyz/miden-tutorials/rust-client/create_deploy_tutorial
    pub async fn create_property_faucet(&self) -> Result<String> {
        info!("Creating property NFT faucet");

        // Steps to implement:
        // 1. Define faucet account code (MASM)
        // 2. Create faucet account
        // 3. Deploy faucet to network
        // 4. Return faucet account ID

        todo!("Implement faucet creation following official tutorial")
    }

    /// Mint a property NFT.
    ///
    /// This function is a placeholder and mirrors the official
    /// mint / consume / create flow tutorial.
    ///
    /// Reference:
    /// https://docs.miden.xyz/miden-tutorials/rust-client/mint_consume_create_tutorial
    pub async fn mint_property_nft(
        &mut self,
        property_id: &str,
        _owner_account_id: &str,
        _ipfs_cid: &str,
        _property_type: u8,
        _price: u64,
    ) -> Result<(String, String)> {
        info!("Minting property NFT: {}", property_id);

        // Ensure client is in sync before minting
        self.sync().await?;

        // Steps to implement:
        // 1. Load faucet account
        // 2. Create NFT asset with metadata
        // 3. Mint NFT via faucet
        // 4. Create note containing NFT
        // 5. Submit transaction
        // 6. Return (transaction_id, note_id)

        todo!("Implement NFT minting following official tutorial")
    }

    /// Retrieve account information.
    ///
    /// Placeholder implementation that can later be expanded to:
    /// - fetch account metadata
    /// - list vault assets
    /// - return note counts
    pub async fn get_account_info(&mut self) -> Result<serde_json::Value> {
        // Sync before reading any state
        self.sync().await?;

        Ok(serde_json::json!({
            "status": "not_implemented",
            "message": "Follow Miden tutorials to implement account queries"
        }))
    }

    /// Transfer a property NFT between accounts.
    ///
    /// This is a placeholder for the full transfer flow:
    /// - consume existing note
    /// - create new note for recipient
    /// - submit transaction
    pub async fn transfer_property(
        &self,
        _note_id: &str,
        from_account: &str,
        to_account: &str,
    ) -> Result<String> {
        info!("Transferring property from {} to {}", from_account, to_account);

        // Steps to implement:
        // 1. Consume the existing NFT note
        // 2. Create a new note addressed to the recipient
        // 3. Submit the transaction
        // 4. Return transaction ID

        todo!("Implement property transfer following official tutorial")
    }
}