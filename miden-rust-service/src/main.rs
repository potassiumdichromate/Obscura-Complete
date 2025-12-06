// src/main.rs - Complete REST API Server with Escrow System
use axum::{
    extract::State,
    routing::{get, post},
    Router,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc, oneshot};
use tokio::task::LocalSet;
use tower_http::cors::CorsLayer;
use tracing::{info, error};

use miden_rust_service::{MidenClientWrapper, escrow::{EscrowAccount, EscrowStatus}};
use miden_client::{account::AccountId, Serializable, Deserializable};

// ============================================================================
// COMMAND PATTERN FOR CLIENT OPERATIONS
// ============================================================================

#[derive(Debug)]
enum ClientCommand {
    MintProperty {
        property_id: String,
        owner_account_id: String,
        ipfs_cid: String,
        property_type: u8,
        price: u64,
        response: oneshot::Sender<Result<(String, String), String>>,
    },
    GetAccountInfo {
        response: oneshot::Sender<Result<serde_json::Value, String>>,
    },
    GetConsumableNotes {
        account_id: Option<String>,
        response: oneshot::Sender<Result<Vec<serde_json::Value>, String>>,
    },
    ConsumeNote {
        note_id: String,
        response: oneshot::Sender<Result<String, String>>,
    },
    TransferProperty {
        property_id: String,
        to_account_id: String,
        response: oneshot::Sender<Result<String, String>>,
    },
    SendTokens {
        to_account_id: String,
        amount: u64,
        response: oneshot::Sender<Result<String, String>>,
    },
    GetBalance {
        account_id: String,
        response: oneshot::Sender<Result<serde_json::Value, String>>,
    },
    CreateEscrow {
        buyer_account_str: String,
        seller_account_str: String,
        amount: u64,
        resp: oneshot::Sender<Result<EscrowAccount, String>>,
    },
    FundEscrow {
        escrow: EscrowAccount,
        resp: oneshot::Sender<Result<String, String>>,
    },
    ReleaseEscrow {
        escrow: EscrowAccount,
        resp: oneshot::Sender<Result<String, String>>,
    },
    RefundEscrow {
        escrow: EscrowAccount,
        resp: oneshot::Sender<Result<String, String>>,
    },
}

// ============================================================================
// APPLICATION STATE
// ============================================================================

#[derive(Clone)]
struct AppState {
    client_tx: mpsc::Sender<ClientCommand>,
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
struct MintPropertyRequest {
    property_id: String,
    owner_account_id: String,
    ipfs_cid: String,
    property_type: u8,
    price: u64,
}

#[derive(Debug, Serialize)]
struct MintPropertyResponse {
    success: bool,
    transaction_id: Option<String>,
    note_id: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TransferPropertyRequest {
    property_id: String,
    to_account_id: String,
}

#[derive(Debug, Serialize)]
struct TransferPropertyResponse {
    success: bool,
    transaction_id: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SendTokensRequest {
    to_account_id: String,
    amount: u64,
}

#[derive(Debug, Serialize)]
struct SendTokensResponse {
    success: bool,
    transaction_id: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ConsumeNoteRequest {
    note_id: String,
}

#[derive(Debug, Serialize)]
struct ConsumeNoteResponse {
    success: bool,
    transaction_id: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct ConsumableNotesResponse {
    success: bool,
    notes: Vec<serde_json::Value>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountInfoResponse {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct BalanceResponse {
    success: bool,
    balance: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

// Escrow Request/Response Types
#[derive(Debug, Deserialize)]
struct CreateEscrowRequest {
    buyer_account_id: String,
    seller_account_id: String,
    amount: u64,
}

#[derive(Debug, Serialize)]
struct CreateEscrowResponse {
    escrow_account_id: String,
    buyer_account_id: String,
    seller_account_id: String,
    amount: u64,
    status: String,
}

#[derive(Debug, Deserialize)]
struct FundEscrowRequest {
    escrow_account_id: String,
    buyer_account_id: String,
    seller_account_id: String,
    amount: u64,
}

#[derive(Debug, Deserialize)]
struct ReleaseEscrowRequest {
    escrow_account_id: String,
    buyer_account_id: String,
    seller_account_id: String,
    amount: u64,
}

#[derive(Debug, Deserialize)]
struct RefundEscrowRequest {
    escrow_account_id: String,
    buyer_account_id: String,
    seller_account_id: String,
    amount: u64,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn parse_account_id_from_hex(hex_str: &str) -> Result<AccountId, String> {
    // Remove 0x prefix if present
    let hex_str = hex_str.strip_prefix("0x").unwrap_or(hex_str);
    
    // Decode hex to bytes
    let bytes = hex::decode(hex_str)
        .map_err(|e| format!("Failed to decode hex: {}", e))?;
    
    // Deserialize AccountId from bytes using Deserializable trait
    AccountId::read_from_bytes(&bytes[..])
        .map_err(|e| format!("Failed to deserialize AccountId: {}", e))
}

// ============================================================================
// MAIN SERVER
// ============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,miden_rust_service=debug".into())
        )
        .init();

    info!("🚀 Starting Miden Rust Service with Escrow System...");

    // Create channel for client commands
    let (client_tx, mut client_rx) = mpsc::channel::<ClientCommand>(100);

    // Create a LocalSet for !Send futures
    let local = LocalSet::new();

    // Spawn the client initialization task within LocalSet
    local.spawn_local(async move {
        info!("🔧 Initializing Miden client...");
        match MidenClientWrapper::new().await {
            Ok(mut client) => {
                info!("✅ Miden client initialized successfully");
                info!("📡 Client task ready to process commands");
                
                // Process commands
                while let Some(cmd) = client_rx.recv().await {
                    match cmd {
                        ClientCommand::MintProperty {
                            property_id,
                            owner_account_id,
                            ipfs_cid,
                            property_type,
                            price,
                            response,
                        } => {
                            info!("Processing mint property: {}", property_id);
                            let result = client
                                .mint_property_nft(
                                    &property_id,
                                    &owner_account_id,
                                    &ipfs_cid,
                                    property_type,
                                    price,
                                )
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::GetAccountInfo { response } => {
                            info!("Processing get account info");
                            let result = client
                                .get_account_info()
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::GetConsumableNotes { account_id, response } => {
                            info!("Processing get consumable notes");
                            let result = client
                                .get_consumable_notes(account_id)
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::ConsumeNote { note_id, response } => {
                            info!("Processing consume note: {}", note_id);
                            let result = client
                                .consume_note(&note_id)
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::TransferProperty { property_id, to_account_id, response } => {
                            info!("Processing transfer property: {} to {}", property_id, to_account_id);
                            let result = client
                                .transfer_property(&property_id, &to_account_id)
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::SendTokens { to_account_id, amount, response } => {
                            info!("Processing send tokens: {} to {}", amount, to_account_id);
                            let result = client
                                .send_tokens(&to_account_id, amount)
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::GetBalance { account_id, response } => {
                            info!("Processing get balance: {}", account_id);
                            let result = client
                                .get_account_balance(&account_id)
                                .await
                                .map_err(|e| e.to_string());
                            
                            let _ = response.send(result);
                        }
                        ClientCommand::CreateEscrow { buyer_account_str, seller_account_str, amount, resp } => {
                            info!("Processing create escrow");
                            let result = client.create_escrow(&buyer_account_str, &seller_account_str, amount).await
                                .map_err(|e| e.to_string());
                            let _ = resp.send(result);
                        }
                        ClientCommand::FundEscrow { escrow, resp } => {
                            info!("Processing fund escrow");
                            let result = client.fund_escrow(&escrow).await
                                .map_err(|e| e.to_string());
                            let _ = resp.send(result);
                        }
                        ClientCommand::ReleaseEscrow { escrow, resp } => {
                            info!("Processing release escrow");
                            let result = client.release_escrow(&escrow).await
                                .map_err(|e| e.to_string());
                            let _ = resp.send(result);
                        }
                        ClientCommand::RefundEscrow { escrow, resp } => {
                            info!("Processing refund escrow");
                            let result = client.refund_escrow(&escrow).await
                                .map_err(|e| e.to_string());
                            let _ = resp.send(result);
                        }
                    }
                }
                
                error!("⚠️ Client task channel closed");
            }
            Err(e) => {
                error!("❌ Failed to initialize Miden client: {}", e);
            }
        }
    });

    // Create application state with command sender
    let state = AppState { client_tx };

    // Build router with CORS
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/get-account", get(get_account_info))
        .route("/mint-property", post(mint_property))
        .route("/get-consumable-notes", get(get_consumable_notes))
        .route("/consume-note", post(consume_note))
        .route("/transfer-property", post(transfer_property))
        .route("/send-tokens", post(send_tokens))
        .route("/get-balance/:account_id", get(get_balance))
        // Escrow endpoints
        .route("/create-escrow", post(create_escrow))
        .route("/fund-escrow", post(fund_escrow))
        .route("/release-escrow", post(release_escrow))
        .route("/refund-escrow", post(refund_escrow))
        .with_state(state)
        .layer(CorsLayer::permissive());

    // Start server
    let addr = "127.0.0.1:3000";
    info!("🌐 Server listening on http://{}", addr);
    info!("🔒 Escrow system enabled");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    // Run both the LocalSet and the server concurrently
    tokio::select! {
        _ = local => {
            error!("❌ LocalSet (client task) terminated");
        }
        result = axum::serve(listener, app) => {
            result?;
        }
    }

    Ok(())
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

// Health check endpoint
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "miden-rust-service-with-escrow".to_string(),
    })
}

// Get account info endpoint
async fn get_account_info(
    State(state): State<AppState>,
) -> (StatusCode, Json<AccountInfoResponse>) {
    info!("Received get account info request");

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::GetAccountInfo { response: tx };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command to client task: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(AccountInfoResponse {
                success: false,
                data: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(data)) => {
            info!("✅ Account info retrieved");
            (
                StatusCode::OK,
                Json(AccountInfoResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to get account info: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AccountInfoResponse {
                    success: false,
                    data: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AccountInfoResponse {
                    success: false,
                    data: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Mint property endpoint
async fn mint_property(
    State(state): State<AppState>,
    Json(payload): Json<MintPropertyRequest>,
) -> (StatusCode, Json<MintPropertyResponse>) {
    info!("Received mint property request: {:?}", payload);

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::MintProperty {
        property_id: payload.property_id.clone(),
        owner_account_id: payload.owner_account_id,
        ipfs_cid: payload.ipfs_cid,
        property_type: payload.property_type,
        price: payload.price,
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command to client task: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(MintPropertyResponse {
                success: false,
                transaction_id: None,
                note_id: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok((tx_id, note_id))) => {
            info!("✅ Property minted: tx={}, note={}", tx_id, note_id);
            (
                StatusCode::OK,
                Json(MintPropertyResponse {
                    success: true,
                    transaction_id: Some(tx_id),
                    note_id: Some(note_id),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to mint property: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(MintPropertyResponse {
                    success: false,
                    transaction_id: None,
                    note_id: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(MintPropertyResponse {
                    success: false,
                    transaction_id: None,
                    note_id: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Get consumable notes endpoint
async fn get_consumable_notes(
    State(state): State<AppState>,
) -> (StatusCode, Json<ConsumableNotesResponse>) {
    info!("Received get consumable notes request");

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::GetConsumableNotes {
        account_id: None,
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ConsumableNotesResponse {
                success: false,
                notes: vec![],
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(notes)) => {
            info!("✅ Retrieved {} consumable notes", notes.len());
            (
                StatusCode::OK,
                Json(ConsumableNotesResponse {
                    success: true,
                    notes,
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to get notes: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ConsumableNotesResponse {
                    success: false,
                    notes: vec![],
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ConsumableNotesResponse {
                    success: false,
                    notes: vec![],
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Consume note endpoint
async fn consume_note(
    State(state): State<AppState>,
    Json(payload): Json<ConsumeNoteRequest>,
) -> (StatusCode, Json<ConsumeNoteResponse>) {
    info!("Received consume note request: {:?}", payload);

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::ConsumeNote {
        note_id: payload.note_id.clone(),
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ConsumeNoteResponse {
                success: false,
                transaction_id: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Note consumed: tx={}", tx_id);
            (
                StatusCode::OK,
                Json(ConsumeNoteResponse {
                    success: true,
                    transaction_id: Some(tx_id),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to consume note: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ConsumeNoteResponse {
                    success: false,
                    transaction_id: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ConsumeNoteResponse {
                    success: false,
                    transaction_id: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Transfer property endpoint
async fn transfer_property(
    State(state): State<AppState>,
    Json(payload): Json<TransferPropertyRequest>,
) -> (StatusCode, Json<TransferPropertyResponse>) {
    info!("Received transfer property request: {:?}", payload);

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::TransferProperty {
        property_id: payload.property_id.clone(),
        to_account_id: payload.to_account_id.clone(),
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(TransferPropertyResponse {
                success: false,
                transaction_id: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Property transferred: tx={}", tx_id);
            (
                StatusCode::OK,
                Json(TransferPropertyResponse {
                    success: true,
                    transaction_id: Some(tx_id),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to transfer property: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(TransferPropertyResponse {
                    success: false,
                    transaction_id: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(TransferPropertyResponse {
                    success: false,
                    transaction_id: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Send tokens endpoint
async fn send_tokens(
    State(state): State<AppState>,
    Json(payload): Json<SendTokensRequest>,
) -> (StatusCode, Json<SendTokensResponse>) {
    info!("Received send tokens request: {:?}", payload);

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::SendTokens {
        to_account_id: payload.to_account_id.clone(),
        amount: payload.amount,
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(SendTokensResponse {
                success: false,
                transaction_id: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Tokens sent: tx={}", tx_id);
            (
                StatusCode::OK,
                Json(SendTokensResponse {
                    success: true,
                    transaction_id: Some(tx_id),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to send tokens: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(SendTokensResponse {
                    success: false,
                    transaction_id: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(SendTokensResponse {
                    success: false,
                    transaction_id: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// Get balance endpoint
async fn get_balance(
    State(state): State<AppState>,
    axum::extract::Path(account_id): axum::extract::Path<String>,
) -> (StatusCode, Json<BalanceResponse>) {
    info!("Received get balance request for: {}", account_id);

    let (tx, rx) = oneshot::channel();
    let cmd = ClientCommand::GetBalance {
        account_id: account_id.clone(),
        response: tx,
    };

    if let Err(e) = state.client_tx.send(cmd).await {
        error!("❌ Failed to send command: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(BalanceResponse {
                success: false,
                balance: None,
                error: Some("Client task unavailable".to_string()),
            }),
        );
    }

    match rx.await {
        Ok(Ok(balance)) => {
            info!("✅ Balance retrieved");
            (
                StatusCode::OK,
                Json(BalanceResponse {
                    success: true,
                    balance: Some(balance),
                    error: None,
                }),
            )
        }
        Ok(Err(e)) => {
            error!("❌ Failed to get balance: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(BalanceResponse {
                    success: false,
                    balance: None,
                    error: Some(e),
                }),
            )
        }
        Err(_) => {
            error!("❌ Client task dropped response channel");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(BalanceResponse {
                    success: false,
                    balance: None,
                    error: Some("Internal communication error".to_string()),
                }),
            )
        }
    }
}

// ============================================================================
// ESCROW ENDPOINTS
// ============================================================================

// POST /create-escrow - Create new escrow account
async fn create_escrow(
    State(state): State<AppState>,
    Json(payload): Json<CreateEscrowRequest>,
) -> Json<serde_json::Value> {
    info!("Received create escrow request: {:?}", payload);

    let (resp_tx, resp_rx) = oneshot::channel();

    let command = ClientCommand::CreateEscrow {
        buyer_account_str: payload.buyer_account_id,
        seller_account_str: payload.seller_account_id,
        amount: payload.amount,
        resp: resp_tx,
    };

    if state.client_tx.send(command).await.is_err() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Client task not available"
        }));
    }

    match resp_rx.await {
        Ok(Ok(escrow)) => {
            info!("✅ Escrow created: escrow_id={}", escrow.escrow_account_id);
            
            // Serialize AccountIds using Serializable trait
            let escrow_hex = format!("0x{}", hex::encode(escrow.escrow_account_id.to_bytes()));
            let buyer_hex = format!("0x{}", hex::encode(escrow.buyer_account_id.to_bytes()));
            let seller_hex = format!("0x{}", hex::encode(escrow.seller_account_id.to_bytes()));
            
            Json(serde_json::json!({
                "success": true,
                "escrow": {
                    "escrow_account_id": escrow_hex,
                    "buyer_account_id": buyer_hex,
                    "seller_account_id": seller_hex,
                    "amount": escrow.amount,
                    "status": "created"
                },
                "error": null
            }))
        }
        Ok(Err(e)) => {
            error!("❌ Failed to create escrow: {}", e);
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "error": "Internal communication error"
        })),
    }
}

// POST /fund-escrow - Buyer funds the escrow
async fn fund_escrow(
    State(state): State<AppState>,
    Json(payload): Json<FundEscrowRequest>,
) -> Json<serde_json::Value> {
    info!("Received fund escrow request: {:?}", payload);

    let escrow_account_id = match parse_account_id_from_hex(&payload.escrow_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid escrow account ID: {}", e)
            }));
        }
    };

    let buyer_account_id = match parse_account_id_from_hex(&payload.buyer_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid buyer account ID: {}", e)
            }));
        }
    };

    let seller_account_id = match parse_account_id_from_hex(&payload.seller_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid seller account ID: {}", e)
            }));
        }
    };

    let escrow = EscrowAccount {
        escrow_account_id,
        buyer_account_id,
        seller_account_id,
        amount: payload.amount,
        status: EscrowStatus::Created,
    };

    let (resp_tx, resp_rx) = oneshot::channel();

    let command = ClientCommand::FundEscrow {
        escrow,
        resp: resp_tx,
    };

    if state.client_tx.send(command).await.is_err() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Client task not available"
        }));
    }

    match resp_rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Escrow funded: tx={}", tx_id);
            Json(serde_json::json!({
                "success": true,
                "transaction_id": tx_id,
                "error": null
            }))
        }
        Ok(Err(e)) => {
            error!("❌ Failed to fund escrow: {}", e);
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "error": "Internal communication error"
        })),
    }
}

// POST /release-escrow - Release funds to seller
async fn release_escrow(
    State(state): State<AppState>,
    Json(payload): Json<ReleaseEscrowRequest>,
) -> Json<serde_json::Value> {
    info!("Received release escrow request: {:?}", payload);

    let escrow_account_id = match parse_account_id_from_hex(&payload.escrow_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid escrow account ID: {}", e)
            }));
        }
    };

    let buyer_account_id = match parse_account_id_from_hex(&payload.buyer_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid buyer account ID: {}", e)
            }));
        }
    };

    let seller_account_id = match parse_account_id_from_hex(&payload.seller_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid seller account ID: {}", e)
            }));
        }
    };

    let escrow = EscrowAccount {
        escrow_account_id,
        buyer_account_id,
        seller_account_id,
        amount: payload.amount,
        status: EscrowStatus::Funded,
    };

    let (resp_tx, resp_rx) = oneshot::channel();

    let command = ClientCommand::ReleaseEscrow {
        escrow,
        resp: resp_tx,
    };

    if state.client_tx.send(command).await.is_err() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Client task not available"
        }));
    }

    match resp_rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Escrow released: tx={}", tx_id);
            Json(serde_json::json!({
                "success": true,
                "transaction_id": tx_id,
                "error": null
            }))
        }
        Ok(Err(e)) => {
            error!("❌ Failed to release escrow: {}", e);
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "error": "Internal communication error"
        })),
    }
}

// POST /refund-escrow - Refund to buyer
async fn refund_escrow(
    State(state): State<AppState>,
    Json(payload): Json<RefundEscrowRequest>,
) -> Json<serde_json::Value> {
    info!("Received refund escrow request: {:?}", payload);

    let escrow_account_id = match parse_account_id_from_hex(&payload.escrow_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid escrow account ID: {}", e)
            }));
        }
    };

    let buyer_account_id = match parse_account_id_from_hex(&payload.buyer_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid buyer account ID: {}", e)
            }));
        }
    };

    let seller_account_id = match parse_account_id_from_hex(&payload.seller_account_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid seller account ID: {}", e)
            }));
        }
    };

    let escrow = EscrowAccount {
        escrow_account_id,
        buyer_account_id,
        seller_account_id,
        amount: payload.amount,
        status: EscrowStatus::Funded,
    };

    let (resp_tx, resp_rx) = oneshot::channel();

    let command = ClientCommand::RefundEscrow {
        escrow,
        resp: resp_tx,
    };

    if state.client_tx.send(command).await.is_err() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Client task not available"
        }));
    }

    match resp_rx.await {
        Ok(Ok(tx_id)) => {
            info!("✅ Escrow refunded: tx={}", tx_id);
            Json(serde_json::json!({
                "success": true,
                "transaction_id": tx_id,
                "error": null
            }))
        }
        Ok(Err(e)) => {
            error!("❌ Failed to refund escrow: {}", e);
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "error": "Internal communication error"
        })),
    }
}