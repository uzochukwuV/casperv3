#!/bin/bash
# Verify NCTL node is ready for deployment

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

NODE_ADDRESS="${NODE_ADDRESS:-http://localhost:11101}"

echo -e "${YELLOW}Checking Casper Node...${NC}"
echo ""

# Check if node responds
echo "1. Checking node connectivity..."
RESPONSE=$(curl -s -X POST $NODE_ADDRESS/rpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"info_get_status","params":[],"id":1}')

if echo "$RESPONSE" | grep -q "chainspec_name"; then
    CHAIN_NAME=$(echo "$RESPONSE" | jq -r '.result.chainspec_name')
    echo -e "   ${GREEN}✓ Node is running${NC}"
    echo -e "   Chain: $CHAIN_NAME"
else
    echo -e "   ${RED}✗ Node not responding correctly${NC}"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Check if secret key exists
echo ""
echo "2. Checking secret key..."
if [ -f ~/.casper/keys/secret_key.pem ]; then
    echo -e "   ${GREEN}✓ Secret key found${NC}"
else
    echo -e "   ${YELLOW}! Secret key not found${NC}"
    echo "   Run: docker exec mynctl cat /home/casper/casper-node/utils/nctl/assets/net-1/faucet/secret_key.pem > ~/.casper/keys/secret_key.pem"
fi

# Check if WASM files exist
echo ""
echo "3. Checking WASM files..."
if [ -f "../wasm/Factory.wasm" ]; then
    SIZE=$(ls -lh ../wasm/Factory.wasm | awk '{print $5}')
    echo -e "   ${GREEN}✓ Factory.wasm found ($SIZE)${NC}"
else
    echo -e "   ${RED}✗ Factory.wasm not found${NC}"
    exit 1
fi

if [ -f "../wasm/Pool.wasm" ]; then
    SIZE=$(ls -lh ../wasm/Pool.wasm | awk '{print $5}')
    echo -e "   ${GREEN}✓ Pool.wasm found ($SIZE)${NC}"
else
    echo -e "   ${RED}✗ Pool.wasm not found${NC}"
    exit 1
fi

if [ -f "../wasm/PositionManager.wasm" ]; then
    SIZE=$(ls -lh ../wasm/PositionManager.wasm | awk '{print $5}')
    echo -e "   ${GREEN}✓ PositionManager.wasm found ($SIZE)${NC}"
else
    echo -e "   ${RED}✗ PositionManager.wasm not found${NC}"
    exit 1
fi

# Check casper-client
echo ""
echo "4. Checking casper-client..."
if command -v casper-client &> /dev/null; then
    VERSION=$(casper-client --version | head -1)
    echo -e "   ${GREEN}✓ casper-client installed${NC}"
    echo -e "   Version: $VERSION"
else
    echo -e "   ${RED}✗ casper-client not found${NC}"
    echo "   Install: cargo install casper-client"
    echo "   Add to PATH: export PATH=\"\$HOME/.cargo/bin:\$PATH\""
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All checks passed! Ready to deploy.${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Copy faucet key (if not done):"
echo "   docker exec mynctl cat /home/casper/casper-node/utils/nctl/assets/net-1/faucet/secret_key.pem > ~/.casper/keys/secret_key.pem"
echo ""
echo "2. Deploy Factory:"
echo "   See DEPLOY_GUIDE.md for full commands"
