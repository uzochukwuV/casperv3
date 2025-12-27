# Pool Deployment Guide - Using casper-client

## Prerequisites

1. **Build the contracts:**
   ```bash
   cd smart-contract/dex-contracts
   cargo odra build
   ```

2. **Have a funded account** with CSPR for gas fees
3. **casper-client** installed

## Deployment Workflow

### Step 1: Build Contract WASMs

```bash
cd smart-contract/dex-contracts
cargo odra build

# WASMs will be in: wasm/
ls wasm/
# Output: Factory.wasm  Pool.wasm  PositionManager.wasm
```

### Step 2: Deploy Test Tokens (if needed)

You'll need two token contracts. If you don't have them, you can:

**Option A: Use existing testnet tokens** (recommended for testing)

**Option B: Deploy mock tokens** using the Odra examples or existing CEP-18 contracts

### Step 3: Deploy Pool Contract

```bash
# Set your variables
NODE_ADDRESS="http://localhost:11101/rpc"  # or testnet: https://rpc.testnet.casperlabs.io
CHAIN_NAME="casper-test"
SECRET_KEY_PATH="path/to/your/secret_key.pem"
FACTORY_HASH="da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9"
TOKEN0_HASH="<YOUR_TOKEN0_PACKAGE_HASH>"
TOKEN1_HASH="<YOUR_TOKEN1_PACKAGE_HASH>"

# Deploy Pool
casper-client put-transaction \
  --node-address $NODE_ADDRESS \
  --chain-name $CHAIN_NAME \
  --secret-key $SECRET_KEY_PATH \
  --payment-amount 500000000000 \
  --session-path wasm/Pool.wasm \
  --session-arg "factory:key='package-$FACTORY_HASH'" \
  --session-arg "token0:key='package-$TOKEN0_HASH'" \
  --session-arg "token1:key='package-$TOKEN1_HASH'" \
  --session-arg "fee:u32='3000'" \
  --session-arg "tick_spacing:i32='60'"
```

**Wait for the transaction to execute**, then get the Pool contract package hash from the deploy result.

### Step 4: Initialize Pool with Starting Price

```bash
POOL_HASH="<POOL_CONTRACT_PACKAGE_HASH_FROM_STEP_3>"
SQRT_PRICE_X96="79228162514264337593543950336"  # Price = 1 (equal value)

casper-client put-transaction \
  --node-address $NODE_ADDRESS \
  --chain-name $CHAIN_NAME \
  --secret-key $SECRET_KEY_PATH \
  --payment-amount 100000000000 \
  --session-package-hash $POOL_HASH \
  --session-entry-point initialize \
  --session-arg "sqrt_price_x96:u256='$SQRT_PRICE_X96'"
```

### Step 5: Register Pool in Factory (Optional)

```bash
casper-client put-transaction \
  --node-address $NODE_ADDRESS \
  --chain-name $CHAIN_NAME \
  --secret-key $SECRET_KEY_PATH \
  --payment-amount 50000000000 \
  --session-package-hash $FACTORY_HASH \
  --session-entry-point register_pool \
  --session-arg "token0:key='package-$TOKEN0_HASH'" \
  --session-arg "token1:key='package-$TOKEN1_HASH'" \
  --session-arg "fee:u32='3000'" \
  --session-arg "pool:key='package-$POOL_HASH'"
```

---

## Important Notes

### Argument Types for Odra Address

When passing contract addresses to Odra contracts, use the `key` type with `package-` prefix:

```bash
# ✅ Correct for Odra Address type
--session-arg "factory:key='package-da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9'"

# ❌ Wrong - will cause "User error: 64658"
--session-arg "factory:byte_array='da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9'"
--session-arg "factory:key='hash-da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9'"
```

### Gas Amounts

- **Deploy Pool**: 500 CSPR (500000000000 motes)
- **Initialize Pool**: 100 CSPR (100000000000 motes)
- **Register Pool**: 50 CSPR (50000000000 motes)

---

## Price Calculations

Convert price to `sqrt_price_x96` format:

### Python

```python
import math

def price_to_sqrt_price_x96(price):
    sqrt_price = math.sqrt(price)
    sqrt_price_x96 = int(sqrt_price * (2 ** 96))
    return sqrt_price_x96

# Examples:
print(price_to_sqrt_price_x96(1))      # 79228162514264337593543950336
print(price_to_sqrt_price_x96(2000))   # 3541774862582897494122009600000
print(price_to_sqrt_price_x96(0.0005)) # 1772451696570916425203200
```

### JavaScript

```javascript
function priceToSqrtPriceX96(price) {
  const sqrtPrice = Math.sqrt(price);
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
  return sqrtPriceX96.toString();
}

console.log(priceToSqrtPriceX96(1));     // Equal prices
console.log(priceToSqrtPriceX96(2000));  // 1 token0 = 2000 token1
console.log(priceToSqrtPriceX96(0.0005)); // 1 token0 = 0.0005 token1
```

---

## Fee Tiers

| Fee (bps) | Percentage | Tick Spacing | Use Case |
|-----------|------------|--------------|----------|
| 500       | 0.05%      | 10           | Stablecoins (USDC/USDT) |
| 3000      | 0.30%      | 60           | Standard pairs (ETH/USDC) |
| 10000     | 1.00%      | 200          | Exotic pairs |

---

## Querying Pool State

After deployment and initialization, query the pool:

```bash
# Get current price
casper-client query-global-state \
  --node-address $NODE_ADDRESS \
  --state-root-hash <STATE_ROOT_HASH> \
  --key package-$POOL_HASH \
  -q "get_sqrt_price_x96"

# Get current tick
casper-client query-global-state \
  --node-address $NODE_ADDRESS \
  --state-root-hash <STATE_ROOT_HASH> \
  --key package-$POOL_HASH \
  -q "get_tick"

# Get liquidity
casper-client query-global-state \
  --node-address $NODE_ADDRESS \
  --state-root-hash <STATE_ROOT_HASH> \
  --key package-$POOL_HASH \
  -q "get_liquidity"
```

---

## Troubleshooting

### Error: "User error: 64658"
- **Cause**: Wrong argument types for Odra Address
- **Fix**: Use `key` type with `package-` prefix (see examples above)

### Error: "Invalid transaction - exceeds block gas limit"
- **Cause**: Gas amount too high
- **Fix**: Use 500 CSPR (500000000000 motes) for Pool deployment

### Error: "Insufficient funds"
- **Cause**: Account doesn't have enough CSPR for gas
- **Fix**: Fund your account with at least 500+ CSPR

---

## Next Steps

After successful deployment:

1. **Add CEP-18 Integration** to Pool (currently TODOs in mint/collect)
2. **Test with PositionManager** to add liquidity
3. **Implement Swaps** once tokens are integrated
4. **Build Frontend** for user interaction

See [smart-contract/dex-contracts/README.md](./smart-contract/dex-contracts/README.md) for contract details.
