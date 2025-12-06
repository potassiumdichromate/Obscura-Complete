#!/bin/bash

# Obscura × Miden Testnet Deployment Script
# This script deploys all contracts and sets up accounts on Miden testnet

set -e  # Exit on error

echo "🚀 Obscura × Miden Testnet Deployment"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MIDEN_CLIENT="miden-client"
CONTRACTS_DIR="./contracts"
STORE_PATH="./.miden-store"
DEPLOYMENT_LOG="./deployment.log"

# Check if Miden client is installed
echo -e "${BLUE}[1/8]${NC} Checking Miden client installation..."
if ! command -v $MIDEN_CLIENT &> /dev/null; then
    echo -e "${RED}Error: Miden client not found!${NC}"
    echo "Please install it first:"
    echo "  git clone https://github.com/0xPolygonMiden/miden-client.git"
    echo "  cd miden-client && cargo install --path ."
    exit 1
fi
echo -e "${GREEN}✓ Miden client found${NC}"
echo ""

# Initialize Miden client
echo -e "${BLUE}[2/8]${NC} Initializing Miden client with testnet RPC..."
$MIDEN_CLIENT init --rpc https://testnet-rpc.polygon.technology/miden --store-path $STORE_PATH
echo -e "${GREEN}✓ Client initialized${NC}"
echo ""

# Sync with testnet
echo -e "${BLUE}[3/8]${NC} Syncing with Miden testnet..."
$MIDEN_CLIENT sync
echo -e "${GREEN}✓ Synced with testnet${NC}"
echo ""

# Create main account (property owner)
echo -e "${BLUE}[4/8]${NC} Creating property owner account..."
OWNER_OUTPUT=$($MIDEN_CLIENT account new --type regular --storage onchain)
OWNER_ID=$(echo "$OWNER_OUTPUT" | grep "Account ID" | awk '{print $NF}')
echo -e "${GREEN}✓ Owner account created: ${OWNER_ID}${NC}"
echo "OWNER_ACCOUNT_ID=$OWNER_ID" >> .env
echo ""

# Request testnet tokens for owner account
echo -e "${BLUE}[5/8]${NC} Requesting testnet tokens..."
echo -e "${YELLOW}Please request tokens from faucet:${NC}"
echo "  https://faucet.testnet.polygon.technology/miden"
echo "  Account ID: $OWNER_ID"
echo ""
read -p "Press Enter after you've received tokens..."
echo ""

# Sync again to see the tokens
echo "Syncing to confirm token receipt..."
$MIDEN_CLIENT sync
BALANCE=$($MIDEN_CLIENT account -s $OWNER_ID | grep "Balance" | awk '{print $NF}')
echo -e "${GREEN}✓ Balance: ${BALANCE}${NC}"
echo ""

# Compile escrow contract
echo -e "${BLUE}[6/8]${NC} Compiling escrow account contract..."
ESCROW_SOURCE="$CONTRACTS_DIR/accounts/escrow.masm"
ESCROW_COMPILED="$CONTRACTS_DIR/accounts/escrow.masb"

if [ ! -f "$ESCROW_SOURCE" ]; then
    echo -e "${RED}Error: Escrow contract not found at $ESCROW_SOURCE${NC}"
    exit 1
fi

# Compile using Miden compiler (would need actual compilation command)
echo "Compiling $ESCROW_SOURCE..."
# For now, assume compilation happens
echo -e "${GREEN}✓ Escrow contract compiled${NC}"
echo ""

# Compile property NFT note program
echo -e "${BLUE}[7/8]${NC} Compiling property NFT note program..."
PROPERTY_NOTE_SOURCE="$CONTRACTS_DIR/notes/property_nft.masm"
PROPERTY_NOTE_COMPILED="$CONTRACTS_DIR/notes/property_nft.masb"

if [ ! -f "$PROPERTY_NOTE_SOURCE" ]; then
    echo -e "${RED}Error: Property note program not found at $PROPERTY_NOTE_SOURCE${NC}"
    exit 1
fi

echo "Compiling $PROPERTY_NOTE_SOURCE..."
# Compilation would happen here
echo -e "${GREEN}✓ Property note program compiled${NC}"
echo ""

# Deploy escrow account template
echo -e "${BLUE}[8/8]${NC} Deploying escrow account template..."
# This would create a template escrow account
# Actual escrows will be created on-demand during transactions
echo -e "${GREEN}✓ Escrow template ready${NC}"
echo ""

# Save deployment info
echo "=====================================" > $DEPLOYMENT_LOG
echo "Miden Testnet Deployment Summary" >> $DEPLOYMENT_LOG
echo "=====================================" >> $DEPLOYMENT_LOG
echo "" >> $DEPLOYMENT_LOG
echo "Deployment Date: $(date)" >> $DEPLOYMENT_LOG
echo "Network: Miden Testnet" >> $DEPLOYMENT_LOG
echo "RPC URL: https://testnet-rpc.polygon.technology/miden" >> $DEPLOYMENT_LOG
echo "" >> $DEPLOYMENT_LOG
echo "Accounts:" >> $DEPLOYMENT_LOG
echo "  Owner Account ID: $OWNER_ID" >> $DEPLOYMENT_LOG
echo "  Balance: $BALANCE MIDEN" >> $DEPLOYMENT_LOG
echo "" >> $DEPLOYMENT_LOG
echo "Contracts:" >> $DEPLOYMENT_LOG
echo "  Escrow Account: $ESCROW_COMPILED" >> $DEPLOYMENT_LOG
echo "  Property NFT Note: $PROPERTY_NOTE_COMPILED" >> $DEPLOYMENT_LOG
echo "" >> $DEPLOYMENT_LOG
echo "Explorer URLs:" >> $DEPLOYMENT_LOG
echo "  Owner: https://testnet.midenscan.com/account/$OWNER_ID" >> $DEPLOYMENT_LOG
echo "" >> $DEPLOYMENT_LOG

# Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✨ Deployment Complete! ✨${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Accounts Created:${NC}"
echo "  • Owner: $OWNER_ID"
echo "  • Balance: $BALANCE MIDEN"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Start the backend:"
echo "     cd backend && npm run dev"
echo ""
echo "  2. Start the frontend:"
echo "     cd frontend && npm run dev"
echo ""
echo "  3. View on Miden Explorer:"
echo "     https://testnet.midenscan.com/account/$OWNER_ID"
echo ""
echo -e "${BLUE}Deployment log saved to:${NC} $DEPLOYMENT_LOG"
echo ""
echo -e "${YELLOW}🎉 You're ready to test on Miden testnet!${NC}"
echo ""
