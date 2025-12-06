// src/escrow.rs - Escrow System Implementation for Real Estate Transactions
// Add this to your lib.rs as a module

use anyhow::Result;
use rand::RngCore;
use miden_client::{
    account::{AccountBuilder, AccountId, AccountStorageMode, AccountType, component::BasicWallet},
    asset::FungibleAsset,
    auth::AuthSecretKey,
    crypto::rpo_falcon512::SecretKey,
    note::{create_p2id_note, NoteType},
    transaction::{OutputNote, TransactionRequestBuilder},
    Felt,
};
use miden_lib::account::auth::AuthRpoFalcon512;

use crate::MidenClientWrapper;

/// Escrow account information
#[derive(Debug, Clone)]
pub struct EscrowAccount {
    pub escrow_account_id: AccountId,
    pub buyer_account_id: AccountId,
    pub seller_account_id: AccountId,
    pub amount: u64,
    pub status: EscrowStatus,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    Released,
    Refunded,
    Disputed,
}

impl MidenClientWrapper {
    /// Create a new escrow account for a property transaction
    pub async fn create_escrow(
        &mut self,
        buyer_account_str: &str,
        seller_account_str: &str,
        amount: u64,
    ) -> Result<EscrowAccount> {
        tracing::info!("🔒 Creating escrow account");
        tracing::info!("   Buyer: {}", buyer_account_str);
        tracing::info!("   Seller: {}", seller_account_str);
        tracing::info!("   Amount: {}", amount);

        // Get the actual accounts from the client
        let buyer_account = if buyer_account_str == "alice" {
            self.alice_account_id
                .ok_or_else(|| anyhow::anyhow!("Alice account not initialized"))?
        } else {
            return Err(anyhow::anyhow!("Unknown buyer account: {}", buyer_account_str));
        };

        let seller_account = if seller_account_str == "faucet" {
            self.faucet_account_id
                .ok_or_else(|| anyhow::anyhow!("Faucet account not initialized"))?
        } else {
            return Err(anyhow::anyhow!("Unknown seller account: {}", seller_account_str));
        };

        // Create escrow account (regular account that will hold funds)
        let mut init_seed = [0u8; 32];
        self.client.rng().fill_bytes(&mut init_seed);
        let key_pair = SecretKey::with_rng(self.client.rng());

        let builder = AccountBuilder::new(init_seed)
            .account_type(AccountType::RegularAccountUpdatableCode)
            .storage_mode(AccountStorageMode::Public)
            .with_auth_component(AuthRpoFalcon512::new(key_pair.public_key().into()))
            .with_component(BasicWallet);

        let escrow_account = builder.build()?;
        let escrow_account_id = escrow_account.id();

        // Add escrow account to client
        self.client.add_account(&escrow_account, false).await?;
        self.keystore.add_key(&AuthSecretKey::RpoFalcon512(key_pair))?;

        tracing::info!("✅ Escrow account created: {}", escrow_account_id);

        // Sync state
        self.client.sync_state().await?;

        Ok(EscrowAccount {
            escrow_account_id,
            buyer_account_id: buyer_account,
            seller_account_id: seller_account,
            amount,
            status: EscrowStatus::Created,
        })
    }

    /// Fund the escrow account (buyer sends tokens to escrow)
    pub async fn fund_escrow(
        &mut self,
        escrow: &EscrowAccount,
    ) -> Result<String> {
        tracing::info!("💰 Funding escrow");
        tracing::info!("   From (Buyer): {}", escrow.buyer_account_id);
        tracing::info!("   To (Escrow): {}", escrow.escrow_account_id);
        tracing::info!("   Amount: {}", escrow.amount);

        // Sync first to get latest state
        self.client.sync_state().await?;

        // Get buyer's account to access vault
        let buyer_account = self
            .client
            .get_account(escrow.buyer_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Buyer account not found"))?;

        // Get assets from buyer's vault
        let vault = buyer_account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        if vault_assets.is_empty() {
            return Err(anyhow::anyhow!("Buyer's vault is empty. Cannot fund escrow."));
        }

        tracing::info!("✅ Found {} assets in buyer's vault", vault_assets.len());

        // For this POC, send ALL assets from vault to escrow
        // In production, you'd select specific assets matching the amount
        let assets_to_send: Vec<_> = vault_assets.into_iter().collect();

        tracing::info!("📦 Sending {} assets to escrow", assets_to_send.len());

        // Create P2ID note to escrow account
        let p2id_note = create_p2id_note(
            escrow.buyer_account_id,
            escrow.escrow_account_id,
            assets_to_send,
            NoteType::Public,
            Felt::new(0),
            &mut self.rng,
        )?;

        // Create transaction with output note
        let output_notes = vec![OutputNote::Full(p2id_note)];
        let transaction_request = TransactionRequestBuilder::new()
            .own_output_notes(output_notes)
            .build()?;

        tracing::info!("📝 Executing fund escrow transaction...");

        // Submit transaction from buyer's account
        let transaction_id = self
            .client
            .submit_new_transaction(escrow.buyer_account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("✅ Escrow funded! TX: {}", tx_id);

        // Sync
        self.client.sync_state().await?;

        Ok(tx_id)
    }

    /// Release funds from escrow to seller (on successful sale)
    pub async fn release_escrow(
        &mut self,
        escrow: &EscrowAccount,
    ) -> Result<String> {
        tracing::info!("🔓 Releasing escrow funds to seller");
        tracing::info!("   Escrow: {}", escrow.escrow_account_id);
        tracing::info!("   To (Seller): {}", escrow.seller_account_id);

        // Sync to get latest notes
        self.client.sync_state().await?;

        // Get consumable notes for escrow account
        let consumable_notes = self
            .client
            .get_consumable_notes(Some(escrow.escrow_account_id))
            .await?;

        if consumable_notes.is_empty() {
            return Err(anyhow::anyhow!("No funds in escrow to release"));
        }

        tracing::info!("✅ Found {} note(s) in escrow", consumable_notes.len());

        // First consume the notes to add to escrow vault
        let note_ids: Vec<_> = consumable_notes
            .iter()
            .map(|(note, _)| note.id())
            .collect();

        let consume_request = TransactionRequestBuilder::new()
            .build_consume_notes(note_ids)?;

        tracing::info!("📝 Consuming escrow notes...");

        let consume_tx_id = self
            .client
            .submit_new_transaction(escrow.escrow_account_id, consume_request)
            .await?;

        tracing::info!("✅ Notes consumed: {}", consume_tx_id);

        // Sync to update vault
        self.client.sync_state().await?;

        // Now transfer from escrow vault to seller
        let escrow_account = self
            .client
            .get_account(escrow.escrow_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Escrow account not found"))?;

        // Get assets from vault
        let vault = escrow_account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        if vault_assets.is_empty() {
            return Err(anyhow::anyhow!("Escrow vault is empty after consumption"));
        }

        tracing::info!("💰 Transferring {} asset(s) to seller", vault_assets.len());

        // Create P2ID note to seller
        let p2id_note = create_p2id_note(
            escrow.escrow_account_id,
            escrow.seller_account_id,
            vault_assets.into_iter().collect(),
            NoteType::Public,
            Felt::new(0),
            &mut self.rng,
        )?;

        // Create transaction
        let output_notes = vec![OutputNote::Full(p2id_note)];
        let transaction_request = TransactionRequestBuilder::new()
            .own_output_notes(output_notes)
            .build()?;

        tracing::info!("📝 Executing release to seller...");

        // Submit from escrow account
        let transaction_id = self
            .client
            .submit_new_transaction(escrow.escrow_account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("✅ Escrow released to seller! TX: {}", tx_id);

        // Sync
        self.client.sync_state().await?;

        Ok(tx_id)
    }

    /// Refund escrow to buyer (if sale fails)
    pub async fn refund_escrow(
        &mut self,
        escrow: &EscrowAccount,
    ) -> Result<String> {
        tracing::info!("↩️  Refunding escrow to buyer");
        tracing::info!("   Escrow: {}", escrow.escrow_account_id);
        tracing::info!("   To (Buyer): {}", escrow.buyer_account_id);

        // Sync to get latest notes
        self.client.sync_state().await?;

        // Get consumable notes for escrow account
        let consumable_notes = self
            .client
            .get_consumable_notes(Some(escrow.escrow_account_id))
            .await?;

        if consumable_notes.is_empty() {
            return Err(anyhow::anyhow!("No funds in escrow to refund"));
        }

        tracing::info!("✅ Found {} note(s) in escrow", consumable_notes.len());

        // Consume notes
        let note_ids: Vec<_> = consumable_notes
            .iter()
            .map(|(note, _)| note.id())
            .collect();

        let consume_request = TransactionRequestBuilder::new()
            .build_consume_notes(note_ids)?;

        let consume_tx_id = self
            .client
            .submit_new_transaction(escrow.escrow_account_id, consume_request)
            .await?;

        tracing::info!("✅ Notes consumed: {}", consume_tx_id);

        // Sync
        self.client.sync_state().await?;

        // Get escrow account with updated vault
        let escrow_account = self
            .client
            .get_account(escrow.escrow_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Escrow account not found"))?;

        // Get assets
        let vault = escrow_account.account().vault();
        let vault_assets: Vec<_> = vault.assets().collect();

        if vault_assets.is_empty() {
            return Err(anyhow::anyhow!("Escrow vault is empty"));
        }

        tracing::info!("💰 Refunding {} asset(s) to buyer", vault_assets.len());

        // Create P2ID note back to buyer
        let p2id_note = create_p2id_note(
            escrow.escrow_account_id,
            escrow.buyer_account_id,
            vault_assets.into_iter().collect(),
            NoteType::Public,
            Felt::new(0),
            &mut self.rng,
        )?;

        // Create transaction
        let output_notes = vec![OutputNote::Full(p2id_note)];
        let transaction_request = TransactionRequestBuilder::new()
            .own_output_notes(output_notes)
            .build()?;

        tracing::info!("📝 Executing refund to buyer...");

        // Submit
        let transaction_id = self
            .client
            .submit_new_transaction(escrow.escrow_account_id, transaction_request)
            .await?;

        let tx_id = transaction_id.to_string();
        tracing::info!("✅ Escrow refunded to buyer! TX: {}", tx_id);

        // Sync
        self.client.sync_state().await?;

        Ok(tx_id)
    }

    /// Get escrow account balance
    pub async fn get_escrow_balance(
        &mut self,
        escrow_account_id: AccountId,
    ) -> Result<serde_json::Value> {
        tracing::info!("💰 Getting escrow balance: {}", escrow_account_id);

        self.client.sync_state().await?;

        let account = self
            .client
            .get_account(escrow_account_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Escrow account not found"))?;

        let _vault = account.account().vault();

        Ok(serde_json::json!({
            "escrow_account_id": escrow_account_id.to_string(),
            "vault_available": true,
            "is_public": account.account().is_public(),
        }))
    }
}