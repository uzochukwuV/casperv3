#!/bin/bash

echo "==================================="
echo "Uzzy3 DEX API Endpoint Testing"
echo "==================================="
echo ""

BASE_URL="http://localhost:3001"
TCSPR="11e528cd01b3b40845e1353ea482fd4f46cab386e88801d53abdfdeb77100859"
USDT="4ad18d2ea1a622e22b9f4c3e4b90eca5708788853d9122113cf78b8a23282dc6"
CDAI="60233c0f979a59991a0a4813846dd2302727f4253911a5c87be6ed1e78196448"

echo "Testing server health..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

echo "Testing DEX endpoints registration..."
curl -s "$BASE_URL/api/dex/test" | jq '.'
echo ""

echo "Testing deployment info..."
curl -s "$BASE_URL/api/dex/deployment-info" | jq '.success, .contracts'
echo ""

echo "Testing pools list..."
curl -s "$BASE_URL/api/dex/pools" | jq '.data[0]'
echo ""

echo "Testing CSPR.cloud connectivity..."
curl -s "$BASE_URL/api/dex/test-cspr-cloud" | jq '.success'
echo ""

echo "Testing pool query (with query params)..."
curl -s "$BASE_URL/api/dex/pool-query?token0=$TCSPR&token1=$USDT&fee=3000" | jq '.success, .data.fee'
echo ""

echo "==================================="
echo "INSTRUCTIONS TO FIX PATH PARAMETERS:"
echo "==================================="
echo "1. Stop the server (Ctrl+C)"
echo "2. Restart with: cd server && npm run api:dev"
echo "3. Then test these endpoints:"
echo ""
echo "Pool Data:"
echo "curl \"$BASE_URL/api/dex/pool/$TCSPR/$USDT/3000\""
echo ""
echo "Swap Quote:"
echo "curl -X POST \"$BASE_URL/api/dex/quote\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"token_in\":\"$TCSPR\",\"token_out\":\"$USDT\",\"fee\":3000,\"amount_in\":\"1000000000\"}'"
echo ""
echo "Current Price:"
echo "curl \"$BASE_URL/api/dex/price/$TCSPR/$USDT/3000\""
echo ""
echo "TWAP Query:"
echo "curl \"$BASE_URL/api/dex/twap/$TCSPR/$USDT/3000/3600/0\""
echo ""
echo "Multi-hop Quote:"
echo "curl -X POST \"$BASE_URL/api/dex/router/quote-multi-hop\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"path\":[\"$TCSPR\",\"$USDT\",\"$CDAI\"],\"fees\":[3000,3000],\"amount_in\":\"1000000000\"}'"
echo ""
echo "Position NFT:"
echo "curl \"$BASE_URL/api/dex/position-manager/1\""
echo ""