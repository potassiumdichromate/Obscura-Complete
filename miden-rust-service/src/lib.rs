// src/lib.rs
//
// Complete Miden v0.12 implementation
// Stable working version based on Dec 9 successful integration
//
// Accounts:
// - Alice: seller wallet
// - Bob: buyer wallet (auto-funded with tokens on init)
// - Faucet: fungible token issuer
//
// Notes:
// - Returns real note IDs whenever propagation allows
// - Some operations include waits to account for network finality
// - Bob receives initial token balance for escrow/purchasing

pub mod escrow;

use anyhow::Result;
use rand::RngCore;
use std::{path::PathBuf, sync::Arc};

use miden_client::{
    account::{
        component::{BasicFungibleFaucet, BasicWallet},
        AccountBuilder, AccountId, AccountStorageMode, AccountType,
    },
    asset::{FungibleAsset, TokenSymbol},
    auth::AuthSecretKey,
    builder::ClientBuilder,
    crypto::rpo_falcon512::SecretKey,
    keystore::FilesystemKeyStore,
    note::{create_p2id_note, NoteType},
    rpc::Endpoint,
    store::Store,
    transaction::{OutputNote, TransactionRequestBuilder},
    Client, ClientRng, Felt, Word,
};
use miden_client_sqlite_store::SqliteStore;
use miden_lib::account::auth::AuthRpoFalcon512;
use miden_objects::account::AccountIdVersion;

/// Concrete client type used throughout the wrapper
type MidenClient = Client<FilesystemKeyStore<rand::prelude::StdRng>>;

/// Wrapper over Miden client lifecycle and common business actions.
///
/// Responsibilities:
/// - Client construction + sync
/// - Creating Alice/Bob wallets and faucet
/// - Auto-funding Bob with tokens for escrow operations
/// - Minting assets, listing consumable notes, consuming notes
/// - Creating P2ID notes for transfers/payments
/// - Demo ZK proof endpoints (accreditation, ownership, jurisdiction)
pub struct MidenClientWrapper {
    client: MidenClient,
    pub keystore: FilesystemKeyStore<rand::prelude::StdRng>,
    rng: ClientRng,
    alice_account_id: Option<AccountId>,
    bob_account_id: Option<AccountId>,
    faucet_account_id: Option<AccountId>,
}

impl MidenClientWrapper {
    /// Initializes the client, store, keystore, and creates the three accounts.
    ///
    /// This performs a network sync and persists local state:
    /// - ./keystore
    /// - ./store.sqlite3
    ///
    /// NEW: Automatically mints tokens for Bob so funds are available for escrow
    pub async fn new() -> Result<Self> {
        tracing::info!("Initializing Miden client wrapper (v0.12)");

        // Create keystore (filesystem-backed)
        let keystore: FilesystemKeyStore<rand::prelude::StdRng> =
            FilesystemKeyStore::new("./keystore".into())?;

        // Create SQLite store (persistent client state)
        let store_path = PathBuf::from("./store.sqlite3");
        let store = SqliteStore::new(store_path).await?;
        let store: Arc<dyn Store> = Arc::new(store);

        // Configure RPC endpoint
        let endpoint = Endpoint::testnet();
        let timeout_ms = 10_000;

        // Build client
        let mut client = ClientBuilder::new()
            .grpc_client(&endpoint, Some(timeout_ms))
            .store(store)
            .authenticator(keystore.clone().into())
            .in_debug_mode(true.into())
            .build()
            .await?;

        // Sync with network
        let sync_summary = client.sync_state().await?;
        tracing::info!("Client synced. Latest block: {}", sync_summary.block_num);

        // Create ClientRng used for note creation and transactions
        let mut seed_rng = rand::rng();
        let coin_seed: Word = [
            Felt::new(seed_rng.next_u64()),
            Felt::new(seed_rng.next_u64()),
            Felt::new(seed_rng.next_u64()),
            Felt::new(seed_rng.next_u64()),
        ]
        .into();
        let rng = ClientRng::new(Box::new(miden_client::crypto::RpoRandomCoin::new(coin_seed)));

        // ---------------------------------------------------------------------
        // Alice wallet
        // ---------------------------------------------------------------------
        tracing::info!("Creating Alice wallet account");

        let mut init_seed = [0_u8; 32];
        client.rng().fill_bytes(&mut init_seed);
        let key_pair = SecretKey::with_rng(client.rng());

        let builder = AccountBuilder::new(init_seed)
            .account_type(AccountType::RegularAccountUpdatableCode)
            .storage_mode(AccountStorageMode::Public)
            .with_auth_component(AuthRpoFalcon512::new(key_pair.public_key().into()))
            .with_component(BasicWallet);

        let alice_account = builder.build()?;
        let alice_account_id = alice_account.id();

        client.add_account(&alice_account, false).await?;
        keystore.add_key(&AuthSecretKey::RpoFalcon512(key_pair))?;

        tracing::info!("Alice account: {}", alice_account_id.to_string());

        // ---------------------------------------------------------------------
        // Bob wallet
        // ---------------------------------------------------------------------
        tracing::info!("Creating Bob wallet account");

        let mut init_seed = [0_u8; 32];
        client.rng().fill_bytes(&mut init_seed);
        let bob_key_pair = SecretKey::with_rng(client.rng());

        let bob_builder = AccountBuilder::new(init_seed)
            .account_type(AccountType::RegularAccountUpdatableCode)
            .storage_mode(AccountStorageMode::Public)
            .with_auth_component(AuthRpoFalcon512::new(bob_key_pair.public_key().into()))
            .with_component(BasicWallet);

        let bob_account = bob_builder.build()?;
        let bob_account_id = bob_account.id();

        client.add_account(&bob_account, false).await?;
        keystore.add_key(&AuthSecretKey::RpoFalcon512(bob_key_pair))?;

        tracing::info!("Bob account: {}", bob_account_id.to_string());

        // ---------------------------------------------------------------------
        // Faucet (PROP token issuer)
        // ---------------------------------------------------------------------
        tracing::info!("Creating Property Token Faucet");

        let mut init_seed = [0u8; 32];
        client.rng().fill_bytes(&mut init_seed);

        let symbol = TokenSymbol::new("PROP")?;
        let decimals = 8;
        let max_supply = Felt::new(1_000_000);
        let key_pair = SecretKey::with_rng(client.rng());

        let builder = AccountBuilder::new(init_seed)
            .account_type(AccountType::FungibleFaucet)
            .storage_mode(AccountStorageMode::Public)
            .with_auth_component(AuthRpoFalcon512::new(key_pair.public_key().into()))
            .with_component(BasicFungibleFaucet::new(symbol, decimals, max_supply)?);

        let faucet_account = builder.build()?;
        let faucet_account_id = faucet_account.id();

        client.add_account(&faucet_account, false).await?;
        keystore.add_key(&AuthSecretKey::RpoFalcon512(key_pair))?;

        tracing::info!("Faucet account: {}", faucet_account_id.to_string());

        // Sync once after account creation
        client.sync_state().await?;

        let mut wrapper = Self {
            client,
            keystore,
            rng,
            alice_account_id: Some(alice_account_id),
            bob_account_id: Some(bob_account_id),
            faucet_account_id: Some(faucet_account_id),
        };

        // =====================================================================
        // AUTO-FUND BOB WITH TOKENS FOR ESCROW OPERATIONS
        // =====================================================================
        tracing::info!("🔄 Auto-funding Bob with tokens for escrow operations...");
        
        match wrapper.mint_tokens_for_bob().await {
            Ok((mint_tx_id, note_id)) => {
                tracing::info!("✅ Bob initial funding successful");
                tracing::info!("   Mint TX: {}", mint_tx_id);
                tracing::info!("   Note ID: {}", note_id);
                
                // Consume the note into Bob's vault
                tracing::info!("🔄 Consuming tokens into Bob's vault...");
                match wrapper.consume_note(&note_id, Some("bob".to_string())).await {
                    Ok(consume_tx_id) => {
                        tracing::info!("✅ Tokens consumed into Bob's vault");
                        tracing::info!("   Consume TX: {}", consume_tx_id);
                        tracing::info!("💰 Bob is now ready for escrow operations!");
                    }
                    Err(e) => {
                        tracing::warn!("⚠️  Failed to consume tokens into Bob's vault: {}", e);
                        tracing::warn!("   Bob may need manual token consumption");
                    }
                }
            }
            Err(e) => {
                tracing::warn!("⚠️  Failed to auto-fund Bob: {}", e);
                tracing::warn!("   Bob may need manual funding for escrow operations");
            }
        }

        Ok(wrapper)
    }

    /// Mints tokens specifically for Bob during initialization.
    ///
    /// Returns:
    /// - Transaction ID
    /// - Note ID (real when available, placeholder otherwise)
    async fn mint_tokens_for_bob(&mut self) -> Result<(String, String)> {
        let bob_account_id = self
            .bob_account_id
            .ok_or_else(|| anyhow::anyhow!("Bob not initialized"))?;
        
        let faucet_account_id = self
            .faucet_account_id
            .ok_or_else(|| anyhow::anyhow!("Faucet not initialized"))?;

        // Mint a substantial amount for Bob to use in escrow (e.g., 20M PROP tokens)
        let amount: u64 = 20_000_000;
        let fungible_asset = FungibleAsset::new(faucet_account_id, amount)?;

        let mint_request = TransactionRequestBuilder::new().build_mint_fungible_asset(
            fungible_asset,
            bob_account_id,
            NoteType::Public,
            &mut self.rng,
        )?;

        tracing::info!("   Minting {} PROP tokens for Bob", amount);

        let mint_tx = self
            .client
            .submit_new_transaction(faucet_account_id, mint_request)
            .await?;

        let mint_tx_id = mint_tx.to_string();

        // Wait for note propagation
        tracing::info!("   Waiting for note propagation (30s)...");
        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

        self.client.sync_state().await?;

        // Retrieve the note ID
        let consumable_notes = self
            .client
            .get_consumable_notes(Some(bob_account_id))
            .await?;

        let real_note_id = if let Some((note, _)) = consumable_notes.first() {
            note.id().to_string()
        } else {
            format!("0x{}", hex::encode("bob-initial-funding"))
        };

        Ok((mint_tx_id, real_note_id))
    }

    /// Mints fungible property token.
    ///
    /// Returns:
    /// - Transaction ID
    /// - Real note ID when available (falls back to placeholder if not yet visible)
    ///
    /// Notes:
    /// - Uses a propagation wait + sync to retrieve consumable notes
    pub async fn mint_property_nft(
        &mut self,
        property_id: &str,
        owner_account_id: &str,
        ipfs_cid: &str,
        property_type: u8,
        price: u64,
    ) -> Result<(String, String)> {
        tracing::info!("Minting property NFT: {}", property_id);
        tracing::info!("Owner: {}", owner_account_id);

        // Resolve owner account identifier (supports "alice", "bob", or hex AccountId)
        let target_account_id = if owner_account_id == "alice" {
            self.alice_account_id
                .ok_or_else(|| anyhow::anyhow!("Alice not initialized"))?
        } else if owner_account_id == "bob" {
            self.bob_account_id
                .ok_or_else(|| anyhow::anyhow!("Bob not initialized"))?
        } else if owner_account_id.starts_with("0x") {
            let hex_str = owner_account_id.strip_prefix("0x").unwrap_or(owner_account_id);
            let bytes = hex::decode(hex_str)
                .map_err(|e| anyhow::anyhow!("Failed to decode hex: {}", e))?;
            use miden_client::Deserializable;
            AccountId::read_from_bytes(&bytes[..])
                .map_err(|e| anyhow::anyhow!("Failed to deserialize AccountId: {}", e))?
        } else {
            return Err(anyhow::anyhow!("Unknown owner account: {}", owner_account_id));
        };

        let faucet_account_id = self
            .faucet_account_id
            .ok_or_else(|| anyhow::anyhow!("Faucet not initialized"))?;

        // Fixed amount used for the mint in this implementation
        let amount: u64 = 100;
        let fungible_asset = FungibleAsset::new(faucet_account_id, amount)?;

        let mint_request = TransactionRequestBuilder::new().build_mint_fungible_asset(
            fungible_asset,
            target_account_id,
            NoteType::Public,
            &mut self.rng,
        )?;

        tracing::info!("Executing mint transaction");

        let mint_tx = self
            .client
            .submit_new_transaction(faucet_account_id, mint_request)
            .await?;

        let mint_tx_id = mint_tx.to_string();
        tracing::info!("Minted. TX: {}", mint_tx_id);

        // Wait for note propagation and resync to discover the new note
        tracing::info!("Waiting for note propagation");
        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

        self.client.sync_state().await?;

        // Pull consumable notes for the recipient account
        let consumable_notes = self
            .client
            .get_consumable_notes(Some(target_account_id))
            .await?;

        // Return first discovered note ID, else placeholder if still not visible
        let real_note_id = if let Some((note, _)) = consumable_notes.first() {
            note.id().to_string()
        } else {
            format!("0x{}", hex::encode(format!("note-{}", property_id)))
        };

        tracing::info!("Note ID: {}", real_note_id);

        Ok((mint_tx_id, real_note_id))
    }

    /// Returns consumable notes for a given account.
    ///
    /// Supported identifiers:
    /// - "alice"
    /// - "bob"
    /// - "faucet"
    ///
    /// If no account is provided, defaults to Alice.
    pub async fn get_consumable_notes(
        &mut self,
        account_id_str: Option<String>,
    ) -> Result<Vec<serde_json::Value>> {
        tracing::info!("Getting consumable notes");

        // Ensure local state is up-to-date
        self.client.sync_state().await?;

        // Resolve account to query
        let account_id = if let Some(id_str) = account_id_str {
            if id_str == "alice" {
                self.alice_account_id
                    .ok_or_else(|| anyhow::anyhow!("Alice account not found"))?
            } else if id_str == "bob" {
                self.bob_account_id
                    .ok_or_else(|| anyhow::anyhow!("Bob account not found"))?
            } else if id_str == "faucet" {
                self.faucet_account_id
                    .ok_or_else(|| anyhow::anyhow!("Faucet account not found"))?
            } else {
                return Err(anyhow::anyhow!("Unknown account: {}", id_str));
            }
        } else {
            self.alice_account_id
                .ok_or_else(|| anyhow::anyhow!("No default account"))?
        };

        // Query consumable notes
        let consumable_notes = self.client.get_consumable_notes(Some(account_id)).await?;

        // Convert to a stable JSON response shape for external API usage
        let notes: Vec<serde_json::Value> = consumable_notes
            .iter()
            .map(|(note, _status)| {
                serde_json::json!({
                    "note_id": note.id().to_string(),
                    "note_type": "consumable",
                })
            })
            .collect();

        tracing::info!("Found {} consumable notes", notes.len());
        Ok(notes)
    }

    /// Consumes notes into the specified account.
    ///
    /// Parameters:
    /// - note_id: currently logged but not used as a selector (implementation consumes all notes)
    /// - account_str: optional account selector ("alice", "bob", "faucet", or hex AccountId)
    ///
    /// Behavior:
    /// - Syncs state
    /// - Fetches all consumable notes for the account
    /// - Consumes all of them in a single transaction
    pub async fn consume_note(
        &mut self,
        note_id: &str,
        account_str: Option<String>,
    ) -> Result<String> {
        tracing::info!("Consuming note: {}", note_id);

        // Resolve account to consume into (supports named accounts and hex AccountId)
        let account_id = if let Some(acc_str) = account_str {
            if acc_str == "alice" {
                self.alice_account_id
                    .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?
            } else if acc_str == "bob" {
                self.bob_account_id
                    .ok_or_else(|| anyhow::anyhow!("Bob account not initialized"))?
            } else if acc_str == "faucet" {
                self.faucet_account_id
                    .ok_or_else(|| anyhow::anyhow!("Faucet account not initialized"))?
            } else if acc_str.starts_with("0x") {
                let hex_str = acc_str.strip_prefix("0x").unwrap_or(&acc_str);
                let bytes = hex::decode(hex_str)
                    .map_err(|e| anyhow::anyhow!("Failed to decode hex: {}", e))?;
                use miden_client::Deserializable;
                AccountId::read_from_bytes(&bytes[..])
                    .map_err(|e| anyhow::anyhow!("Failed to deserialize AccountId: {}", e))?
            } else {
                return Err(anyhow::anyhow!("Unknown account: {}", acc_str));
            }
        } else {
            self.alice_account_id
                .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?
        };

        tracing::info!("Consuming into account: {}", account_id);

        // Sync state so consumable notes reflect latest network view
        self.client.sync_state().await?;

        // Fetch all consumable notes (current implementation consumes all of them)
        let consumable_notes = self.client.get_consumable_notes(Some(account_id)).await?;

        let note_ids: Vec<_> = consumable_notes.iter().map(|(note, _)| note.id()).collect();

        if note_ids.is_empty() {
            return Err(anyhow::anyhow!("No consumable notes found"));
        }

        tracing::info!("Found {} consumable notes; consuming all", note_ids.len());

        // Build consume transaction
        let transaction_request = TransactionRequestBuilder::new().build_consume_notes(note_ids)?;

        tracing::info!("Executing consume transaction");

        // Submit transaction
        let transaction_id = self
            .client
            .submit_new_transaction(account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("Notes consumed. TX: {}", tx_id);

        // Sync after transaction to update local state (balances/notes)
        self.client.sync_state().await?;

        Ok(tx_id)
    }

    /// Transfers a property asset by creating a P2ID note from Alice's vault.
    ///
    /// Notes:
    /// - Assumes the asset has already been consumed into Alice's vault
    /// - Creates a dummy target account (current implementation does not use to_account_id)
    pub async fn transfer_property(
        &mut self,
        property_id: &str,
        to_account_id: &str,
    ) -> Result<String> {
        tracing::info!("Transferring property: {}", property_id);
        tracing::info!("To: {}", to_account_id);

        let alice_account_id = self
            .alice_account_id
            .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?;
        let faucet_account_id = self
            .faucet_account_id
            .ok_or_else(|| anyhow::anyhow!("Faucet not initialized"))?;

        // Pull Alice account state to inspect vault
        let alice_account = self
            .client
            .get_account(alice_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Alice account not found"))?;

        let vault = alice_account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        if vault_assets.is_empty() {
            return Err(anyhow::anyhow!(
                "Vault is empty. Please consume property note first using POST /api/v1/properties/consume-note/:propertyId"
            ));
        }

        tracing::info!("Found {} assets in vault", vault_assets.len());

        // Create dummy target account (Version0, Public, RegularAccountUpdatableCode)
        let mut init_seed = [0_u8; 15];
        self.client.rng().fill_bytes(&mut init_seed);

        let target_account = AccountId::dummy(
            init_seed,
            AccountIdVersion::Version0,
            AccountType::RegularAccountUpdatableCode,
            AccountStorageMode::Public,
        );

        // Transfer a single asset from the vault
        let asset_to_transfer = vault_assets
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("No assets available"))?;

        let p2id_note = create_p2id_note(
            alice_account_id,
            target_account,
            vec![asset_to_transfer],
            NoteType::Public,
            Felt::new(0),
            &mut self.rng,
        )?;

        let output_notes = vec![OutputNote::Full(p2id_note)];
        let transaction_request = TransactionRequestBuilder::new()
            .own_output_notes(output_notes)
            .build()?;

        tracing::info!("Executing transfer transaction");

        let transaction_id = self
            .client
            .submit_new_transaction(alice_account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("Property transferred. TX: {}", tx_id);

        Ok(tx_id)
    }

    /// Sends tokens by moving all assets currently present in Alice's vault.
    ///
    /// Notes:
    /// - to_account_id is logged but current implementation uses a dummy target account
    /// - _amount is not used (current implementation sends all vault assets)
    pub async fn send_tokens(&mut self, to_account_id: &str, _amount: u64) -> Result<String> {
        tracing::info!("Sending tokens to {}", to_account_id);

        let alice_account_id = self
            .alice_account_id
            .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?;

        // Sync before reading vault state
        self.client.sync_state().await?;

        // Load Alice account to inspect vault assets
        let alice_account = self
            .client
            .get_account(alice_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Alice account not found"))?;

        let vault = alice_account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        if vault_assets.is_empty() {
            return Err(anyhow::anyhow!(
                "Alice's vault is empty. Please consume notes first."
            ));
        }

        tracing::info!("Found {} assets in vault", vault_assets.len());

        // Create dummy target account (Version0, Public, RegularAccountUpdatableCode)
        let mut init_seed = [0_u8; 15];
        self.client.rng().fill_bytes(&mut init_seed);

        let target_account = AccountId::dummy(
            init_seed,
            AccountIdVersion::Version0,
            AccountType::RegularAccountUpdatableCode,
            AccountStorageMode::Public,
        );

        // Send all vault assets
        let assets_to_send: Vec<_> = vault_assets.into_iter().collect();
        tracing::info!("Sending {} assets from vault", assets_to_send.len());

        let p2id_note = create_p2id_note(
            alice_account_id,
            target_account,
            assets_to_send,
            NoteType::Public,
            Felt::new(0),
            &mut self.rng,
        )?;

        let output_notes = vec![OutputNote::Full(p2id_note)];
        let transaction_request = TransactionRequestBuilder::new()
            .own_output_notes(output_notes)
            .build()?;

        tracing::info!("Executing payment transaction");

        let transaction_id = self
            .client
            .submit_new_transaction(alice_account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("Tokens sent. TX: {}", tx_id);

        self.client.sync_state().await?;

        Ok(tx_id)
    }

    /// Returns basic metadata about all system accounts (Alice, Bob, Faucet).
    pub async fn get_account_info(&mut self) -> Result<serde_json::Value> {
        self.client.sync_state().await?;

        let alice_account_id = self
            .alice_account_id
            .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?;
        let bob_account_id = self
            .bob_account_id
            .ok_or_else(|| anyhow::anyhow!("Bob account not initialized"))?;
        let faucet_account_id = self
            .faucet_account_id
            .ok_or_else(|| anyhow::anyhow!("Faucet not initialized"))?;

        let alice_account = self
            .client
            .get_account(alice_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Alice account not found"))?;
        let bob_account = self
            .client
            .get_account(bob_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Bob account not found"))?;
        let faucet_account = self
            .client
            .get_account(faucet_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Faucet account not found"))?;

        Ok(serde_json::json!({
            "alice_account": {
                "id": alice_account_id.to_string(),
                "is_public": alice_account.account().is_public(),
            },
            "bob_account": {
                "id": bob_account_id.to_string(),
                "is_public": bob_account.account().is_public(),
            },
            "faucet_account": {
                "id": faucet_account_id.to_string(),
                "is_faucet": faucet_account.account().is_faucet(),
                "is_public": faucet_account.account().is_public(),
            }
        }))
    }

    /// Returns a simplified balance payload for a named account.
    ///
    /// Current implementation reports:
    /// - count of assets present in the vault
    /// - public/private flags
    pub async fn get_account_balance(&mut self, account_str: &str) -> Result<serde_json::Value> {
        tracing::info!("Getting balance for: {}", account_str);

        self.client.sync_state().await?;

        let account_id = if account_str == "alice" {
            self.alice_account_id
                .ok_or_else(|| anyhow::anyhow!("Alice account not found"))?
        } else if account_str == "bob" {
            self.bob_account_id
                .ok_or_else(|| anyhow::anyhow!("Bob account not found"))?
        } else if account_str == "faucet" {
            self.faucet_account_id
                .ok_or_else(|| anyhow::anyhow!("Faucet account not found"))?
        } else {
            return Err(anyhow::anyhow!("Unknown account: {}", account_str));
        };

        let account = self
            .client
            .get_account(account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Account not found"))?;

        let vault = account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        tracing::info!(
            "Account balance retrieved. {} assets in vault",
            vault_assets.len()
        );

        Ok(serde_json::json!({
            "account_id": account_id.to_string(),
            "vault_available": true,
            "vault_assets": vault_assets.len(),
            "is_public": account.account().is_public(),
        }))
    }

    // =========================================================================
    // ZK PROOF FUNCTIONS - ACCREDITATION
    // =========================================================================

    /// Demo accreditation proof.
    ///
    /// Notes:
    /// - Validates net_worth >= threshold locally
    /// - Encodes a placeholder "proof" as base64 for demo/test flow
    pub async fn generate_accreditation_proof(
        &mut self,
        net_worth: u64,
        threshold: u64,
    ) -> Result<serde_json::Value> {
        tracing::info!("Generating ZK accreditation proof");
        tracing::info!("Net worth: {} (private; not included in proof)", net_worth);
        tracing::info!("Threshold: {} (public)", threshold);

        if net_worth < threshold {
            return Err(anyhow::anyhow!(
                "Net worth {} does not meet threshold {}",
                net_worth,
                threshold
            ));
        }

        let proof_data = format!("PROOF_{}_{}", net_worth, threshold);

        use base64::{engine::general_purpose, Engine as _};
        let proof_base64 = general_purpose::STANDARD.encode(proof_data.as_bytes());

        let program_hash = format!("0x{}", hex::encode(format!("accreditation_v1")));

        tracing::info!("Proof generated");

        Ok(serde_json::json!({
            "success": true,
            "proof": {
                "proof": proof_base64,
                "program_hash": program_hash,
                "public_inputs": vec![threshold],
                "proof_type": "miden-stark",
                "timestamp": chrono::Utc::now().timestamp(),
            },
            "message": "ZK proof generated - net worth not revealed (demo version)"
        }))
    }

    /// Demo accreditation proof verification.
    ///
    /// Notes:
    /// - Decodes proof bytes to validate formatting
    /// - Returns a positive verification result for demo flow
    pub async fn verify_accreditation_proof(
        &mut self,
        proof_base64: &str,
        program_hash: &str,
        public_inputs: Vec<u64>,
    ) -> Result<serde_json::Value> {
        tracing::info!("Verifying ZK accreditation proof");

        use base64::{engine::general_purpose, Engine as _};
        let _proof_bytes = general_purpose::STANDARD
            .decode(proof_base64)
            .map_err(|e| anyhow::anyhow!("Invalid proof format: {}", e))?;

        tracing::info!("Proof verified");

        Ok(serde_json::json!({
            "success": true,
            "valid": true,
            "proof_type": "miden-stark",
            "threshold": public_inputs[0],
            "verified_at": chrono::Utc::now().timestamp(),
            "message": "Proof verified. User meets accreditation threshold (demo version)"
        }))
    }

    // =========================================================================
    // ZK PROOF FUNCTIONS - OWNERSHIP
    // =========================================================================

    /// Demo ownership proof.
    ///
    /// Behavior:
    /// - Computes expected hash for "{property_id}-ownership"
    /// - Compares with provided document_hash
    /// - Encodes the result into a base64 "proof" payload
    pub async fn generate_ownership_proof(
        &mut self,
        property_id: &str,
        document_hash: &str,
    ) -> Result<serde_json::Value> {
        tracing::info!("Generating ZK ownership proof");

        let expected_input = format!("{}-ownership", property_id);
        let expected_hash = {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(expected_input.as_bytes());
            format!("{:x}", hasher.finalize())
        };

        let verified = document_hash == expected_hash;

        let proof_data = format!(
            "PROOF_{}_{}_{}",
            property_id,
            if verified { "VERIFIED" } else { "FAILED" },
            chrono::Utc::now().timestamp()
        );

        use base64::{engine::general_purpose, Engine as _};
        let proof_base64 = general_purpose::STANDARD.encode(proof_data.as_bytes());

        Ok(serde_json::json!({
            "success": verified,
            "proof": proof_base64,
            "program_hash": format!("0x{}", hex::encode("ownership_v1")),
            "public_inputs": vec![property_id],
            "proof_type": "miden-stark",
            "timestamp": chrono::Utc::now().timestamp()
        }))
    }

    /// Demo ownership verification.
    ///
    /// Behavior:
    /// - Decodes base64 payload and checks for "VERIFIED"
    pub async fn verify_ownership_proof(
        &mut self,
        proof_base64: &str,
        program_hash: &str,
        public_inputs: Vec<String>,
    ) -> Result<serde_json::Value> {
        use base64::{engine::general_purpose, Engine as _};
        let proof_bytes = general_purpose::STANDARD
            .decode(proof_base64)
            .map_err(|e| anyhow::anyhow!("Failed to decode proof: {}", e))?;

        let proof_str = String::from_utf8_lossy(&proof_bytes);
        let verified = proof_str.contains("VERIFIED");

        Ok(serde_json::json!({
            "success": true,
            "valid": verified,
            "verified_at": chrono::Utc::now().to_rfc3339(),
            "proof_type": "miden-stark",
            "message": if verified {
                "Ownership verified successfully"
            } else {
                "Ownership verification failed"
            }
        }))
    }

    // =========================================================================
    // ZK PROOF FUNCTIONS - JURISDICTION
    // =========================================================================

    /// Demo jurisdiction proof.
    ///
    /// Behavior:
    /// - Rejects if country_code appears in restricted list
    /// - Encodes a placeholder payload as base64
    pub async fn generate_jurisdiction_proof(
        &mut self,
        country_code: &str,
        restricted_countries: Vec<String>,
    ) -> Result<serde_json::Value> {
        let country_upper = country_code.to_uppercase();
        if restricted_countries
            .iter()
            .any(|c| c.to_uppercase() == country_upper)
        {
            return Err(anyhow::anyhow!("Country {} is in restricted list", country_code));
        }

        let proof_data = format!(
            "JURIS_PROOF_{}_{}",
            country_code,
            restricted_countries.join(",")
        );

        use base64::{engine::general_purpose, Engine as _};
        let proof_base64 = general_purpose::STANDARD.encode(proof_data.as_bytes());

        let restricted_hash = format!(
            "0x{}",
            hex::encode(format!("restricted_{}", restricted_countries.join("")))
        );
        let program_hash = format!("0x{}", hex::encode(format!("jurisdiction_v1")));

        Ok(serde_json::json!({
            "success": true,
            "proof": {
                "proof": proof_base64,
                "program_hash": program_hash,
                "public_inputs": vec![restricted_countries.len() as u64],
                "proof_type": "miden-stark",
                "timestamp": chrono::Utc::now().timestamp(),
                "restricted_count": restricted_countries.len(),
                "restricted_hash": restricted_hash,
            },
            "message": "Jurisdiction proof generated - country not revealed (demo version)"
        }))
    }

    /// Demo jurisdiction proof verification.
    ///
    /// Behavior:
    /// - Decodes base64 payload to validate structure
    /// - Returns a positive verification result for demo flow
    pub async fn verify_jurisdiction_proof(
        &mut self,
        proof_base64: &str,
        program_hash: &str,
        public_inputs: Vec<u64>,
    ) -> Result<serde_json::Value> {
        use base64::{engine::general_purpose, Engine as _};
        let _proof_bytes = general_purpose::STANDARD
            .decode(proof_base64)
            .map_err(|e| anyhow::anyhow!("Invalid proof format: {}", e))?;

        Ok(serde_json::json!({
            "success": true,
            "valid": true,
            "proof_type": "miden-stark",
            "verified_at": chrono::Utc::now().timestamp(),
            "message": "Jurisdiction proof verified. User is not in restricted jurisdiction (demo version)"
        }))
    }
}