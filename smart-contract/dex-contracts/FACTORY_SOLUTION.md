# Factory Pattern Solution for DEX Contracts

## Problem Summary

Odra framework has limitations with on-chain contract deployment:
1. `#[odra::module(factory=on)]` doesn't provide a registry for managing multiple deployed contracts
2. No built-in way to deploy contracts from within another contract on-chain
3. Cannot use `self.env().new_contract()` without pre-loaded Wasm bytes

## Solution: Manual Pool Registration

We've implemented a **two-step deployment pattern** that works around Odra's limitations:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Deployment Process                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Deploy Pool Contract                                │
│  ─────────────────────────                                   │
│  • Deploy Pool.wasm with PoolInitArgs                        │
│  • Get deployed pool address                                 │
│                                                               │
│  Step 2: Register Pool in Factory                            │
│  ────────────────────────────────                            │
│  • Call Factory.register_pool(pool_address, ...)             │
│  • Only factory owner can register (security)                │
│  • Emits PoolCreated event                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Factory Contract Changes

**File:** [src/factory.rs](src/factory.rs)

#### New Method: `register_pool()`

```rust
pub fn register_pool(
    &mut self,
    pool_address: Address,
    token_a: Address,
    token_b: Address,
    fee: u32,
)
```

**Purpose:** Register an externally-deployed pool with the factory

**Security:** Only the factory owner can call this (prevents malicious pool registration)

**Behavior:**
- Validates token addresses (no duplicates, no zero address)
- Checks fee tier is enabled
- Ensures pool doesn't already exist for this token pair + fee
- Stores pool address in registry
- Emits `PoolCreated` event

#### Modified Method: `create_pool()`

```rust
pub fn create_pool(
    &mut self,
    token_a: Address,
    token_b: Address,
    fee: u32,
) -> PoolInitArgs
```

**New Behavior:** Returns `PoolInitArgs` instead of deploying

**Purpose:** Provide initialization parameters for external deployment

**Workflow:**
1. User calls `factory.create_pool(tokenA, tokenB, fee)`
2. Factory returns `PoolInitArgs` struct
3. User deploys Pool contract with these args
4. User calls `factory.register_pool(pool_address, tokenA, tokenB, fee)`

### 2. External Contract Interface

**File:** [src/factory.rs](src/factory.rs:10-14)

```rust
#[odra::external_contract]
pub trait IFactory {
    fn get_pool(&self, token_a: Address, token_b: Address, fee: u32) -> Option<Address>;
    fn register_pool(&mut self, pool_address: Address, token_a: Address, token_b: Address, fee: u32);
}
```

The `IFactory` trait defines the external interface used by PositionManager to interact with Factory.

### 3. Position Manager Integration

**File:** [src/position_manager.rs](src/position_manager.rs)

**Key Imports:**
```rust
use odra::ContractRef;  // Required for .new() method on contract refs
use crate::pool::IPoolContractRef;
use crate::factory::IFactoryContractRef;
```

**Usage Pattern:**
```rust
// Get pool address from factory
let factory_ref = IFactoryContractRef::new(self.env(), self.factory.get().unwrap());
let pool_address = factory_ref.get_pool(token0, token1, fee)
    .expect("Pool does not exist");

// Create reference to pool contract
let mut pool = IPoolContractRef::new(self.env(), pool_address);

// Call pool methods
pool.mint(recipient, tick_lower, tick_upper, amount);
```

## Deployment Workflow

### For Testing (Odra Test Environment)

```rust
use odra::host::{Deployer, HostRef};

// 1. Deploy factory
let mut factory = FactoryHostRef::deploy(&env, NoArgs);
factory.init();

// 2. Get pool init args
let pool_args = factory.create_pool(token0, token1, 3000);

// 3. Deploy pool
let mut pool = PoolHostRef::deploy(&env, pool_args);
pool.initialize(initial_sqrt_price);

// 4. Register pool with factory
factory.register_pool(pool.address(), token0, token1, 3000);

// 5. Deploy position manager
let mut pos_manager = PositionManagerHostRef::deploy(&env, NoArgs);
pos_manager.init(factory.address());
```

### For Production (Casper Network)

```bash
# 1. Deploy Factory contract
casper-client put-deploy \
  --node-address http://localhost:7777 \
  --chain-name casper-test \
  --session-path wasm/Factory.wasm \
  --payment-amount 100000000000 \
  --session-arg "..."

# 2. Call factory.create_pool() to get PoolInitArgs
# (This can be done via contract call or off-chain calculation)

# 3. Deploy Pool contract with PoolInitArgs
casper-client put-deploy \
  --session-path wasm/Pool.wasm \
  --session-arg "factory:account_hash='hash-...'" \
  --session-arg "token0:account_hash='hash-...'" \
  --session-arg "token1:account_hash='hash-...'" \
  --session-arg "fee:u32='3000'" \
  --session-arg "tick_spacing:i32='60'" \
  --payment-amount 150000000000

# 4. Initialize pool with starting price
casper-client put-deploy \
  --session-hash <pool-hash> \
  --session-entry-point "initialize" \
  --session-arg "sqrt_price_x96:u256='...'" \
  --payment-amount 50000000000

# 5. Register pool with factory
casper-client put-deploy \
  --session-hash <factory-hash> \
  --session-entry-point "register_pool" \
  --session-arg "pool_address:account_hash='hash-...'" \
  --session-arg "token_a:account_hash='hash-...'" \
  --session-arg "token_b:account_hash='hash-...'" \
  --session-arg "fee:u32='3000'" \
  --payment-amount 50000000000

# 6. Deploy PositionManager
casper-client put-deploy \
  --session-path wasm/PositionManager.wasm \
  --session-arg "factory:account_hash='<factory-hash>'" \
  --payment-amount 100000000000
```

## Build Process

### Important: Run from Workspace Root

Due to the workspace structure, you **must** run the build command from the parent directory:

```bash
cd /e/apps/casper/v3/smart-contract
cargo odra build
```

**DO NOT** run from `dex-contracts/` subdirectory - the build will fail to find the correct target path.

### Build Output

After successful build, WASM files will be located at:
- `smart-contract/wasm/Pool.wasm`
- `smart-contract/wasm/Factory.wasm`
- `smart-contract/wasm/PositionManager.wasm`
- `smart-contract/dex-contracts/wasm/` (copies)

### Optimization (Optional)

If you see the error about `wasm-opt` not being installed, you can:

**Option 1:** Install wasm-opt
```bash
npm install -g wasm-opt
# or
cargo install wasm-opt
```

**Option 2:** Skip optimization (for development)
The unoptimized WASM files will still work, just be slightly larger.

## Security Considerations

### 1. Pool Registration Authorization

Only the factory owner can call `register_pool()`. This prevents:
- Malicious actors registering fake pools
- Front-running legitimate pool deployments
- Registry pollution

### 2. Pool Validation

The factory validates:
- Token addresses are different
- No zero addresses
- Fee tier is enabled
- Pool doesn't already exist for this token pair + fee

### 3. Pool Integrity

The factory **does not** validate that the registered pool address:
- Actually contains a Pool contract
- Was initialized with the correct parameters
- Matches the expected token0/token1/fee configuration

**Recommendation:** In production, implement additional validation:
```rust
// Call pool to verify its configuration
let pool_ref = IPoolContractRef::new(self.env(), pool_address);
let pool_info = pool_ref.get_pool_info();
assert!(pool_info.token0 == token0, "Token0 mismatch");
assert!(pool_info.token1 == token1, "Token1 mismatch");
assert!(pool_info.fee == fee, "Fee mismatch");
```

## Testing

Example test demonstrating the full workflow:

```rust
#[test]
fn test_pool_deployment_workflow() {
    let env = odra_test::env();

    // Deploy tokens
    let token0 = deploy_token(&env, "Token0", "TK0");
    let token1 = deploy_token(&env, "Token1", "TK1");

    // Deploy factory
    let mut factory = FactoryHostRef::deploy(&env, NoArgs);
    factory.init();

    // Get init args
    let pool_args = factory.create_pool(
        token0.address(),
        token1.address(),
        3000,
    );

    // Deploy pool
    let mut pool = PoolHostRef::deploy(&env, pool_args);

    // Initialize pool with price (1:1)
    let initial_price = U256::from(1u128 << 96); // sqrt(1) * 2^96
    pool.initialize(initial_price);

    // Register pool
    factory.register_pool(
        pool.address(),
        token0.address(),
        token1.address(),
        3000,
    );

    // Verify registration
    let registered = factory.get_pool(
        token0.address(),
        token1.address(),
        3000,
    );
    assert_eq!(registered, Some(pool.address()));

    // Test position manager
    let mut pos_manager = PositionManagerHostRef::deploy(&env, NoArgs);
    pos_manager.init(factory.address());

    // Mint a position
    let params = MintParams {
        token0: token0.address(),
        token1: token1.address(),
        fee: 3000,
        tick_lower: -100,
        tick_upper: 100,
        amount0_desired: U256::from(1000000u128),
        amount1_desired: U256::from(1000000u128),
        amount0_min: U256::zero(),
        amount1_min: U256::zero(),
        recipient: env.get_account(1),
    };

    let result = pos_manager.mint(params);
    assert!(result.liquidity > U128::zero());
}
```

## Future Improvements

### 1. Factory-Initiated Deployment

If Odra adds support for loading Wasm bytes and deploying contracts on-chain, we can:
```rust
pub fn create_pool(&mut self, ...) -> Address {
    // Load Pool.wasm bytes
    let wasm_bytes = self.pool_wasm.get();

    // Deploy new contract
    let pool_address = self.env().new_contract(
        wasm_bytes,
        pool_init_args,
    );

    // Register automatically
    self.pools.set(&pool_key, pool_address);

    pool_address
}
```

### 2. Pool Verification

Add verification that registered pools match expected configuration:
```rust
pub fn register_pool(&mut self, pool_address: Address, ...) {
    // Existing validation...

    // NEW: Verify pool configuration
    let pool_ref = IPoolContractRef::new(self.env(), pool_address);
    let info = pool_ref.get_pool_info();

    assert_eq!(info.token0, token0, "Token0 mismatch");
    assert_eq!(info.token1, token1, "Token1 mismatch");
    assert_eq!(info.fee, fee, "Fee mismatch");
    assert_eq!(info.factory, self.env().self_address(), "Factory mismatch");

    // Continue with registration...
}
```

This requires adding a `get_pool_info()` method to the Pool contract.

## Summary

**All Issues Resolved:**

✅ **Issue 1:** Factory pattern bypass - Implemented manual `register_pool()` method
✅ **Issue 2:** Compilation errors - Fixed by importing `ContractRef` trait and using correct ref types
✅ **Issue 3:** Build path - Must run `cargo odra build` from workspace root

**Deployment Pattern:**
1. Deploy Pool contract externally
2. Initialize pool with starting price
3. Register pool with factory (owner only)
4. Deploy PositionManager with factory address
5. Users can now create positions via PositionManager

**Security:**
- Only factory owner can register pools
- Factory validates token addresses and fee tiers
- Registry prevents duplicate pools
- (Recommended) Add pool configuration verification

**Build Command:**
```bash
cd /e/apps/casper/v3/smart-contract
cargo odra build
```
