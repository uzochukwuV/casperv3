# CasperSwap V3 DEX - Deployment Guide

Official guide for deploying the DEX contracts to Casper Network.

## Prerequisites

1. ✅ **casper-client** installed
   ```bash
   cargo install casper-client
   export PATH="$HOME/.cargo/bin:$PATH"
   casper-client --version
   ```

2. ✅ **Built WASM files** (already done)
   ```bash
   cd /e/apps/casper/v3/smart-contract
   cargo odra build
   ```

3. ✅ **Secret key** for signing transactions
   - Default location: `~/.casper/keys/secret_key.pem`
   - Or generate new keys: `casper-client keygen /mnt/e/apps/casper/v3/smart-contract/dex-contracts/`

4. ✅ **Running Casper node** (choose one):
   - **Option A**: Local NCTL (testing)
   - **Option B**: Public Testnet (recommended)
   - **Option C**: Mainnet (production)

## Setup: Start Local Node (Optional)

For local testing, use NCTL Docker:

```bash
# Start NCTL
docker run --rm -it --name mynctl -d \
  -p 11101:11101 \
  -p 14101:14101 \
  -p 18101:18101 \
  makesoftware/casper-nctl

# Verify it's running
curl -s http://localhost:11101/rpc | jq
```

## Deployment Steps

### Step 1: Deploy Factory Contract

```bash
casper-client put-transaction session \
 --node-address https://node.testnet.casper.network \
  --chain-name casper-test \
  --secret-key /mnt/e/apps/casper/v3/smart-contract/dex-contracts/secret_key.pem \
  --wasm-path /mnt/e/apps/casper/v3/smart-contract/wasm/Factory.wasm \
  --payment-amount 150000000000 \
  --gas-price-tolerance 1 \
  --standard-payment true \
  --install-upgrade \
  --session-arg "odra_cfg_package_hash_key_name:string='dex_factory_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool='true'" \
  --session-arg "odra_cfg_is_upgradable:bool='true'" \
  --session-arg "odra_cfg_is_upgrade:bool='true'"
```

casper-client put-transaction session \
  --node-address https://node.testnet.casper.network \
  --chain-name casper-test \
  --secret-key /mnt/e/apps/casper/v3/smart-contract/dex-contracts/secret_key.pem \
  --payment-amount 50000000000 \
  --gas-price-tolerance 10 \
  --pricing-mode fixed \
  --wasm-path /mnt/e/apps/casper/v3/smart-contract/wasm/Factory.wasm \
  --session-entry-point call \
  --category 'install-upgrade'
 

**Note the transaction hash** from the output. You'll need it to get the contract package hash.

#### Get Factory Contract Package Hash

Wait for the transaction to finalize, then:

```bash
# Get the deploy result
casper-client get-transaction --node-address http://localhost:11101 <TRANSACTION_HASH>

# Look for "contract-package-hash" in the output
# Example: contract-package-<hash>
```

**Save this hash** - you'll need it for:
- Deploying pools
- Calling factory methods
- Deploying PositionManager

### Step 2: Deploy Pool Contract

For each trading pair (e.g., CSPR/USDC):

```bash
# Replace these with your actual token contract hashes
TOKEN0="hash-aabbccdd..."  # CSPR (or lower hash)
TOKEN1="hash-eeffgg..."    # USDC (or higher hash)
FACTORY_PACKAGE_HASH="contract-package-..."
FEE=3000  # 0.3% = 3000
TICK_SPACING=60

casper-client put-transaction session \
  --node-address http://localhost:11101 \
  --chain-name casper-net-1 \
  --secret-key ~/.casper/keys/secret_key.pem \
  --wasm-path ../wasm/Pool.wasm \
  --payment-amount 500000000000 \
  --gas-price-tolerance 1 \
  --standard-payment true \
  --install-upgrade \
  --session-arg "odra_cfg_package_hash_key_name:string:'dex_pool_cspr_usdc_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool:'true'" \
  --session-arg "odra_cfg_is_upgradable:bool:'true'" \
  --session-arg "odra_cfg_is_upgrade:bool:'false'" \
  --session-arg "factory:string:'${FACTORY_PACKAGE_HASH}'" \
  --session-arg "token0:string:'${TOKEN0}'" \
  --session-arg "token1:string:'${TOKEN1}'" \
  --session-arg "fee:u32:'${FEE}'" \
  --session-arg "tick_spacing:i32:'${TICK_SPACING}'"
```

**Get the Pool package hash** from the transaction result.

### Step 3: Initialize Pool with Starting Price

Calculate the starting price as `sqrt(price) * 2^96`:

```bash
# For 1:1 price ratio
SQRT_PRICE_X96="79228162514264337593543950336"

# For 1:2 ratio (token0 worth 0.5 of token1)
# SQRT_PRICE_X96="112045541949572279837463876454"

POOL_PACKAGE_HASH="contract-package-..."

casper-client put-transaction package \
  --node-address http://localhost:11101 \
  --chain-name casper-net-1 \
  --secret-key ~/.casper/keys/secret_key.pem \
  --gas-price-tolerance 1 \
  --contract-package-hash "${POOL_PACKAGE_HASH}" \
  --payment-amount 2500000000 \
  --standard-payment true \
  --session-entry-point "initialize" \
  --session-arg "sqrt_price_x96:u256:'${SQRT_PRICE_X96}'"
```

### Step 4: Register Pool with Factory

⚠️ **Important**: Only the factory owner can do this!

```bash
casper-client put-transaction package \
  --node-address http://localhost:11101 \
  --chain-name casper-net-1 \
  --secret-key ~/.casper/keys/secret_key.pem \
  --gas-price-tolerance 1 \
  --contract-package-hash "${FACTORY_PACKAGE_HASH}" \
  --payment-amount 2500000000 \
  --standard-payment true \
  --session-entry-point "register_pool" \
  --session-arg "pool_address:string:'${POOL_PACKAGE_HASH}'" \
  --session-arg "token_a:string:'${TOKEN0}'" \
  --session-arg "token_b:string:'${TOKEN1}'" \
  --session-arg "fee:u32:'${FEE}'"
```

### Step 5: Deploy PositionManager

```bash
casper-client put-transaction session \
  --node-address http://localhost:11101 \
  --chain-name casper-net-1 \
  --secret-key ~/.casper/keys/secret_key.pem \
  --wasm-path ../wasm/PositionManager.wasm \
  --payment-amount 450000000000 \
  --gas-price-tolerance 1 \
  --standard-payment true \
  --install-upgrade \
  --session-arg "odra_cfg_package_hash_key_name:string:'dex_position_manager_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool:'true'" \
  --session-arg "odra_cfg_is_upgradable:bool:'true'" \
  --session-arg "odra_cfg_is_upgrade:bool:'false'" \
  --session-arg "factory:string:'${FACTORY_PACKAGE_HASH}'"
```

## Deployment Checklist

Track your deployment progress:

```bash
# Create a deployment record
cat > deployment.env << EOF
# CasperSwap V3 Deployment
# Date: $(date)
# Network: casper-net-1

FACTORY_PACKAGE_HASH="contract-package-..."
POOL_CSPR_USDC_PACKAGE_HASH="contract-package-..."
POSITION_MANAGER_PACKAGE_HASH="contract-package-..."

TOKEN_CSPR="hash-..."
TOKEN_USDC="hash-..."
EOF
```

- [ ] Factory deployed
- [ ] Factory package hash saved
- [ ] Pool deployed (CSPR/USDC)
- [ ] Pool initialized with starting price
- [ ] Pool registered with factory
- [ ] PositionManager deployed
- [ ] All package hashes saved to `deployment.env`

## Reading Contract State

To verify deployment and read contract state:

```bash
# Get state root hash
STATE_ROOT=$(casper-client get-state-root-hash \
  --node-address http://localhost:11101 | \
  jq -r '.result.state_root_hash')

# Query factory's pools
casper-client query-global-state \
  --node-address http://localhost:11101 \
  --state-root-hash $STATE_ROOT \
  --key $FACTORY_PACKAGE_HASH
```

## Price Calculation Helper

Python script to calculate `sqrt_price_x96`:

```python
import math

def price_to_sqrt_price_x96(token1_per_token0):
    """
    Calculate sqrtPriceX96 for pool initialization

    Args:
        token1_per_token0: How many token1 per 1 token0
                          (e.g., if 1 CSPR = 0.05 USDC, pass 0.05)

    Returns:
        sqrtPriceX96 as string for casper-client
    """
    Q96 = 2**96
    sqrt_price = math.sqrt(token1_per_token0)
    sqrt_price_x96 = int(sqrt_price * Q96)
    return str(sqrt_price_x96)

# Examples:
print("1:1 price:", price_to_sqrt_price_x96(1.0))
# Output: 79228162514264337593543950336

print("1 CSPR = 0.05 USDC:", price_to_sqrt_price_x96(0.05))
# Output: 17724702331079961024652887859

print("1 CSPR = 2 USDC:", price_to_sqrt_price_x96(2.0))
# Output: 112045541949572279837463876454
```

## Deployment to Testnet

For public testnet deployment:

```bash
# Use public testnet node
export NODE_ADDRESS="http://65.21.235.219:7777"
export CHAIN_NAME="casper-test"

# Then run the same commands with these environment variables
```

## Deployment to Mainnet

⚠️ **Before mainnet deployment**:

1. Audit all contracts
2. Test thoroughly on testnet
3. Use multi-sig for factory owner
4. Prepare emergency pause mechanism
5. Document all contract addresses
6. Set up monitoring

```bash
export NODE_ADDRESS="http://mainnet-node-address:7777"
export CHAIN_NAME="casper"

# Proceed with extreme caution!
```

## Troubleshooting

### Error: "Invalid transaction"
- Check payment amount is sufficient
- Verify gas price tolerance

### Error: "Contract not found"
- Wait for transaction to finalize (can take 2-3 minutes)
- Verify package hash is correct

### Error: "Wasm deserialization error"
- Ensure WASM files are built correctly
- Run `cargo odra build` again

### Pool registration fails
- Verify you're using the factory owner's keys
- Check pool hasn't been registered already
- Ensure fee tier is enabled in factory

## Next Steps

After successful deployment:

1. **Test swaps**: Try small test swaps to verify functionality
2. **Add liquidity**: Create initial liquidity positions
3. **Frontend integration**: Connect UI to contract package hashes
4. **Monitoring**: Set up event listeners for swaps and liquidity changes
5. **Documentation**: Update user guides with contract addresses

## Support

- Official Odra Docs: https://docs.odra.dev
- Casper Network Docs: https://docs.casper.network
- GitHub Issues: https://github.com/your-repo/issues

---

**Remember**: Always test on testnet first! 🚀
