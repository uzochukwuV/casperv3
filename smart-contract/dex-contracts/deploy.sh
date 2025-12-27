#!/bin/bash
# DEX Deployment Script for Casper Network
# Run this from the dex-contracts directory

set -e

export PATH="$HOME/.cargo/bin:$PATH"

NODE_ADDRESS="${NODE_ADDRESS:-http://localhost:11101}"
CHAIN_NAME="${CHAIN_NAME:-casper-test}"
SECRET_KEY="${SECRET_KEY:-$HOME/.casper/keys/secret_key.pem}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================"
echo "CasperSwap V3 DEX Deployment Script"
echo "======================================${NC}"
echo ""
echo "Configuration:"
echo "  Node: $NODE_ADDRESS"
echo "  Chain: $CHAIN_NAME"
echo "  Secret Key: $SECRET_KEY"
echo ""

if ! command -v casper-client &> /dev/null; then
    echo -e "${RED}Error: casper-client not found${NC}"
    echo "Install it with: cargo install casper-client"
    echo "Or add to PATH: export PATH=\"\$HOME/.cargo/bin:\$PATH\""
    exit 1
fi

if [ ! -f "../wasm/Factory.wasm" ]; then
    echo -e "${RED}Error: WASM files not found in ../wasm/${NC}"
    echo "Build them first with: cd .. && cargo odra build"
    exit 1
fi

echo -e "${GREEN}Step 1: Deploy Factory Contract${NC}"
echo "========================================"

FACTORY_DEPLOY=$(casper-client put-deploy \
    --node-address "$NODE_ADDRESS" \
    --chain-name "$CHAIN_NAME" \
    --secret-key "$SECRET_KEY" \
    --payment-amount 100000000000 \
    --session-path "../wasm/Factory.wasm" \
    --session-entry-point "init" | \
    grep -oP 'deploy-[a-f0-9]{64}' || echo "FAILED")

if [ "$FACTORY_DEPLOY" = "FAILED" ]; then
    echo -e "${RED}Factory deployment failed${NC}"
    exit 1
fi

echo "Factory deploy hash: $FACTORY_DEPLOY"
echo "FACTORY_DEPLOY_HASH=$FACTORY_DEPLOY" > deployment.env

echo ""
echo -e "${GREEN}Deployment Initiated!${NC}"
echo "========================================"
echo ""
echo "Deploy hash: $FACTORY_DEPLOY"
echo ""
echo "To check deploy status:"
echo "  casper-client get-deploy --node-address $NODE_ADDRESS $FACTORY_DEPLOY"
echo ""
echo "Saved to: deployment.env"
