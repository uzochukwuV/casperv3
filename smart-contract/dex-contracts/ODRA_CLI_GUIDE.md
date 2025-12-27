# CasperSwap V3 - Odra CLI Deployment Guide

The Odra CLI provides a much simpler and type-safe way to deploy and interact with your DEX contracts compared to raw `casper-client` commands.

## Prerequisites

1. ✅ **NCTL Node Running**
   ```bash
   docker run --rm -it --name mynctl -d \
     -p 11101:11101 -p 14101:14101 -p 18101:18101 \
     makesoftware/casper-nctl
   ```

2. ✅ **Environment Setup**
   ```bash
   # Set livenet environment variables
   export ODRA_CASPER_LIVENET_SECRET_KEY_PATH="$HOME/.casper/keys/secret_key.pem"
   export ODRA_CASPER_LIVENET_NODE_ADDRESS="http://localhost:11101"
   export ODRA_CASPER_LIVENET_CHAIN_NAME="casper-net-1"
   export ODRA_CASPER_LIVENET_EVENTS_URL="http://localhost:18101"
   ```

3. ✅ **Get Faucet Keys** (for NCTL)
   ```bash
   mkdir -p ~/.casper/keys
   docker exec mynctl cat /home/casper/casper-node/utils/nctl/assets/net-1/faucet/secret_key.pem > ~/.casper/keys/secret_key.pem
   chmod 600 ~/.casper/keys/secret_key.pem
   ```

## CLI Commands Overview

```bash
# Show all available commands
cargo run --bin dex_contracts_cli -- --help

# Available commands:
#  deploy       - Deploy Factory and PositionManager
#  contract     - Interact with deployed contracts
#  scenario     - Run deployment scenarios
#  print-events - View contract events
```

## Step 1: Deploy Core Contracts

Deploy Factory and PositionManager in one command:

```bash
cargo run --bin dex_contracts_cli -- deploy
```

**Output:**
```
🚀 Deploying CasperSwap V3 DEX Contracts...

1️⃣  Deploying Factory...
💁  INFO : Found wasm under "wasm/Factory.wasm".
💁  INFO : Deploying "Factory".
🙄  WAIT : Waiting for transaction...
💁  INFO : Transaction successfully executed.
   ✅ Factory deployed: contract-package-<hash>

2️⃣  Deploying PositionManager...
💁  INFO : Found wasm under "wasm/PositionManager.wasm".
💁  INFO : Deploying "PositionManager".
🙄  WAIT : Waiting for transaction...
💁  INFO : Transaction successfully executed.
   ✅ PositionManager deployed: contract-package-<hash>

✨ Deployment complete!
```

This creates a `contracts.toml` file with the deployed addresses:

```toml
last_updated = "2025-12-22T14:30:00Z"

[[contracts]]
name = "Factory"
package_hash = "hash-..."

[[contracts]]
name = "PositionManager"
package_hash = "hash-..."
```

## Step 2: Deploy a Pool

Deploy a new trading pair (e.g., CSPR/USDC):

```bash
# Replace with your actual token addresses
TOKEN0="hash-aaaa..."  # CSPR
TOKEN1="hash-bbbb..."  # USDC

cargo run --bin dex_contracts_cli -- scenario deploy-pool \
  --token0 "$TOKEN0" \
  --token1 "$TOKEN1" \
  --fee 3000 \
  --price 79228162514264337593543950336
```

**What this does:**
1. Deploys a new Pool contract
2. Initializes it with 1:1 price (sqrt(1) × 2^96)
3. Registers it with the Factory

**Output:**
```
🏊 Deploying Pool...
   Token0: hash-aaaa...
   Token1: hash-bbbb...
   Fee: 3000bp (0.3%)
   Tick Spacing: 60

💁  INFO : Deploying "Pool".
   ✅ Pool deployed: contract-package-<hash>

   Initializing with sqrt_price: 79228162514264337593543950336
   ✅ Pool initialized

   Registering with factory...
   ✅ Pool registered

✨ Pool deployment complete!
   Pool: contract-package-<hash>
```

### Price Calculation

For different price ratios:

```python
# Python helper to calculate sqrt_price_x96
import math

def calc_price(token1_per_token0):
    Q96 = 2**96
    return int(math.sqrt(token1_per_token0) * Q96)

# Examples:
calc_price(1.0)    # 79228162514264337593543950336  (1:1)
calc_price(2.0)    # 112045541949572279837463876454 (1:2)
calc_price(0.05)   # 17724702331079961024652887859  (1 CSPR = 0.05 USDC)
```

## Step 3: Query Deployed Pools

Check if a pool exists:

```bash
cargo run --bin dex_contracts_cli -- scenario query-pool \
  --token0 "hash-aaaa..." \
  --token1 "hash-bbbb..." \
  --fee 3000
```

**Output:**
```
🔍 Querying pool...
   ✅ Pool found: contract-package-<hash>
```

## Step 4: Call Contract Methods Directly

The CLI auto-generates commands for all contract methods!

### View Available Contracts

```bash
cargo run --bin dex_contracts_cli -- contract

# Output:
# Commands for interacting with contracts
#
# Commands:
#   Factory           Commands for the Factory contract
#   Pool              Commands for the Pool contract
#   PositionManager   Commands for the PositionManager contract
```

### View Factory Methods

```bash
cargo run --bin dex_contracts_cli -- contract Factory

# Output:
# Commands:
#   get_pool        Query pool address for token pair
#   register_pool   Register a new pool (owner only)
#   enable_fee_amount  Enable a new fee tier
```

### Call get_pool

```bash
cargo run --bin dex_contracts_cli -- contract Factory get_pool \
  --token_a "hash-aaaa..." \
  --token_b "hash-bbbb..." \
  --fee 3000

# Output:
# 💁  INFO : Call result: Some(hash-cccc...)
```

### Call Pool Methods

```bash
# Get pool's current state
cargo run --bin dex_contracts_cli -- contract Pool get_slot0

# Get liquidity
cargo run --bin dex_contracts_cli -- contract Pool liquidity
```

## Step 5: View Events

Print recent events from a contract:

```bash
cargo run --bin dex_contracts_cli -- print-events Factory -n 10

# Output:
# 💁  INFO : Printing 10 most recent events for 'Factory'
# 💁  INFO : Event 1: 'PoolCreated':
#   'token0': hash-aaaa...
#   'token1': hash-bbbb...
#   'fee': 3000
#   'pool': hash-cccc...
```

## Complete Deployment Example

Here's a full workflow to deploy everything:

```bash
# 1. Set environment
export ODRA_CASPER_LIVENET_SECRET_KEY_PATH="/mnt/e/apps/casper/v3/smart-contract/dex-contracts/secret_key.pem"
export ODRA_CASPER_LIVENET_NODE_ADDRESS="http://localhost:11101"
export ODRA_CASPER_LIVENET_CHAIN_NAME="casper-net-1"

# 2. Deploy core contracts
cargo run --bin dex_contracts_cli -- deploy

# 3. Deploy CSPR/USDC pool (0.3% fee)
cargo run --bin dex_contracts_cli -- scenario deploy-pool \
  --token0 "hash-cspr..." \
  --token1 "hash-usdc..." \
  --fee 3000 \
  --price 79228162514264337593543950336

# 4. Deploy CSPR/DAI pool (0.05% fee)
cargo run --bin dex_contracts_cli -- scenario deploy-pool \
  --token0 "hash-cspr..." \
  --token1 "hash-dai..." \
  --fee 500 \
  --price 79228162514264337593543950336

# 5. Verify pools
cargo run --bin dex_contracts_cli -- scenario query-pool \
  --token0 "hash-cspr..." \
  --token1 "hash-usdc..." \
  --fee 3000
```

## Advantages Over casper-client

| Feature | casper-client | Odra CLI |
|---------|---------------|----------|
| **Type Safety** | ❌ String args, error-prone | ✅ Typed arguments |
| **Auto-generated** | ❌ Manual commands | ✅ Methods from contracts |
| **State Management** | ❌ Manual tracking | ✅ Automatic via contracts.toml |
| **Redeployment** | ❌ Always redeploys | ✅ Skips if already deployed |
| **Error Messages** | ❌ Cryptic hex codes | ✅ Human-readable |
| **Gas Estimation** | ❌ Manual guessing | ✅ Pre-configured |

## Troubleshooting

### Error: "Contract not found"

Make sure `contracts.toml` exists and has the deployed contracts:

```bash
cat contracts.toml
```

### Error: "Transaction failed"

Check gas limits in the CLI code (`bin/cli.rs`) and increase if needed.

### Error: "Pool already exists"

The factory prevents duplicate pools. Use `query-pool` to find the existing one.

### Redeploy After Changes

```bash
# Remove old deployments
rm contracts.toml

# Rebuild WASM
cargo odra build

# Redeploy
cargo run --bin dex_contracts_cli -- deploy
```

## For Production/Testnet

Update environment variables to point to real network:

```bash
# Casper Testnet
export ODRA_CASPER_LIVENET_NODE_ADDRESS="http://65.21.235.219:7777"
export ODRA_CASPER_LIVENET_CHAIN_NAME="casper-test"
export ODRA_CASPER_LIVENET_SECRET_KEY_PATH="/path/to/your/key.pem"
export ODRA_CASPER_LIVENET_EVENTS_URL="http://65.21.235.219:7777"

# Then use same commands
cargo run --bin dex_contracts_cli -- deploy
```

## Summary

**Odra CLI is the recommended way to deploy!**

1. ✅ **Simpler** - No complex casper-client incantations
2. ✅ **Safer** - Type-checked arguments
3. ✅ **Smarter** - Auto-tracks deployments
4. ✅ **Faster** - Less typing, more automation

**Next Steps:**
- Deploy to NCTL for local testing
- Test pool operations
- Deploy to testnet
- Build frontend integration

🚀 Happy deploying!
