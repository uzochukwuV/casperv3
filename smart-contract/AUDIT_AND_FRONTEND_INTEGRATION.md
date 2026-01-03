# CasperSwap V3 DEX - Security Audit & Frontend Integration Analysis

**Date**: 2026-01-01
**Scope**: UnifiedDex, UnifiedPositionManager, Math Libraries
**Deployed Testnet**: ✅ Contracts deployed successfully

---

## 🎯 Executive Summary

### Current Status
- ✅ **Math Libraries**: Excellent - Uniswap V3 proven formulas implemented correctly
- ⚠️ **Core Swap Logic**: CRITICAL - Simplified placeholder, not production-ready
- ⚠️ **Liquidity Management**: CRITICAL - `_modify_position` returns zero amounts
- ⚠️ **Frontend Integration**: Missing essential read functions
- ⚠️ **Multi-hop Routing**: Not implemented
- ✅ **Events**: Good coverage for frontend listening

---

## 🐛 CRITICAL BUGS & ISSUES

### 1. **CRITICAL: Swap Function Is Placeholder**
**File**: [unified_dex.rs:324-375](../smart-contract/dex-contracts/src/unified_dex.rs#L324-L375)

```rust
// Line 341-352: Simplified swap logic - NOT production ready
let (amount0, amount1) = if zero_for_one {
    let amount0_in = amount_specified.abs() as u128;
    let amount1_out = amount0_in * 99 / 100; // ❌ WRONG: Fixed 1% fee, ignores pool state
    (amount_specified, -(amount1_out as i64))
} else {
    let amount1_in = amount_specified.abs() as u128;
    let amount0_out = amount1_in * 99 / 100; // ❌ WRONG: Fixed 1% fee, ignores pool state
    (-(amount0_out as i64), amount_specified)
};
```

**Problems**:
- ❌ Ignores actual pool liquidity and price
- ❌ Doesn't update pool state (sqrt_price_x96, tick, liquidity)
- ❌ No tick crossing logic
- ❌ Fee calculation hardcoded to 1% instead of using pool fee
- ❌ No slippage protection (sqrt_price_limit_x96 ignored)
- ❌ **SECURITY RISK**: Arbitrage bot can drain pool with this formula

**Impact**:
- Pool can be drained
- Prices don't reflect actual supply/demand
- Users get incorrect swap amounts

**Fix Priority**: 🔴 CRITICAL - Must implement before mainnet

---

### 2. **CRITICAL: Liquidity Modification Returns Zero**
**File**: [unified_dex.rs:376-386](../smart-contract/dex-contracts/src/unified_dex.rs#L376-L386)

```rust
fn _modify_position(
    &mut self,
    _pool_id: [u8; 32],
    _owner: Address,
    _tick_lower: i32,
    _tick_upper: i32,
    _liquidity_delta: i64,
) -> (U256, U256) {
    // ❌ Simplified implementation - returns zero amounts
    (U256::zero(), U256::zero())
}
```

**Problems**:
- ❌ No actual liquidity added to pool
- ❌ No tick updates
- ❌ No fee tracking
- ❌ Mint/Burn functions call this but receive 0 amounts
- ❌ Position NFTs track incorrect liquidity values

**Impact**:
- Users "add" liquidity but receive 0 LP tokens
- Pool has no actual liquidity for swaps
- Fees never accrue

**Fix Priority**: 🔴 CRITICAL - Must implement before mainnet

---

### 3. **HIGH: Unused Storage Fields**
**File**: [unified_dex.rs:62-64](../smart-contract/dex-contracts/src/unified_dex.rs#L62-L64)

```rust
ticks: Mapping<([u8; 32], i32), Tick>,           // ⚠️ Never read or written
positions: Mapping<([u8; 32], [u8; 32]), Position>, // ⚠️ Never updated properly
tick_bitmaps: Mapping<[u8; 32], Mapping<i16, U256>>, // ⚠️ Never used
```

**Problems**:
- Dead code warnings in compilation
- Gas cost for deploying unused storage
- Indicates incomplete V3 implementation

**Fix Priority**: 🟡 HIGH - Needed for V3 functionality

---

### 4. **MEDIUM: Position Manager Liquidity Calculation**
**File**: [unified_position_manager.rs:58](../smart-contract/dex-contracts/src/unified_position_manager.rs#L58)

```rust
// Line 58: Placeholder calculation
let liquidity = U128::from(1000u128); // ❌ WRONG: Should calculate from amounts + price
```

**Problems**:
- Hardcoded liquidity value
- Should use `SqrtPriceMath::get_amount0_delta` and `get_amount1_delta`
- Users can't control liquidity added

**Impact**:
- Unpredictable position sizes
- Slippage checks ineffective

**Fix Priority**: 🟡 HIGH - Needed for proper UX

---

### 5. **LOW: Hash Collision Risk in Pool/Position IDs**
**File**: [unified_dex.rs:388-416](../smart-contract/dex-contracts/src/unified_dex.rs#L388-L416)

```rust
fn compute_pool_id(token0: Address, token1: Address, fee: u32) -> [u8; 32] {
    // XOR-based hashing - weak collision resistance
    let mut hash = [0u8; 32];
    for (i, byte) in key_bytes.iter().enumerate() {
        hash[i % 32] ^= byte;  // ❌ Modulo + XOR can collide
    }
    hash
}
```

**Problems**:
- Custom hash function instead of cryptographic hash
- XOR with modulo can produce same hash for different inputs
- Low probability but catastrophic if occurs

**Impact**:
- Different pools/positions could map to same storage key
- Funds could be lost or mixed

**Fix Priority**: 🟢 MEDIUM - Use Blake2b or Keccak256

---

## 📊 FRONTEND INTEGRATION GAPS

### Missing Read Functions (Essential for UI)

#### A. Pool Discovery & Listing
**What Frontend Needs**:
```rust
// Get all pools (paginated)
pub fn get_all_pools(&self, offset: u32, limit: u32) -> Vec<PoolSummary>;

// Get pools by token
pub fn get_pools_by_token(&self, token: Address) -> Vec<PoolSummary>;

// Pool summary struct
pub struct PoolSummary {
    pub pool_id: [u8; 32],
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub liquidity: U128,
    pub sqrt_price_x96: U256,
    pub tick: i32,
    pub fee_growth_global_0_x128: U256,
    pub fee_growth_global_1_x128: U256,
}
```

**Current State**: ❌ Only `get_pool(token0, token1, fee)` exists - requires knowing exact pool beforehand

---

#### B. Price & Quote Functions
**What Frontend Needs**:
```rust
// Get current price in human-readable format
pub fn get_price(&self, token0: Address, token1: Address, fee: u32) -> U256;

// Get swap quote WITHOUT executing
pub fn quote_exact_input_single(
    &self,
    token_in: Address,
    token_out: Address,
    fee: u32,
    amount_in: U256,
) -> QuoteResult;

pub struct QuoteResult {
    pub amount_out: U256,
    pub sqrt_price_x96_after: U256,
    pub tick_after: i32,
    pub fee_amount: U256,
}
```

**Current State**: ❌ No quote function - users can't see swap result before executing

---

#### C. Multi-Hop Routing (CRITICAL for UX)
**What Frontend Needs**:
```rust
// Find best route for token A → token B
pub fn find_best_route(
    &self,
    token_in: Address,
    token_out: Address,
    amount_in: U256,
) -> Route;

// Execute multi-hop swap (e.g., WCSPR → USDC → DAI)
pub fn swap_exact_input_multi_hop(
    &mut self,
    path: Vec<Address>,     // [WCSPR, USDC, DAI]
    fees: Vec<u32>,         // [3000, 3000]
    recipient: Address,
    amount_in: U256,
    amount_out_min: U256,
) -> U256;

pub struct Route {
    pub path: Vec<Address>,
    pub fees: Vec<u32>,
    pub expected_amount_out: U256,
    pub price_impact: u32,  // In basis points
}
```

**Current State**: ❌ Not implemented - users can only swap pairs with direct pools

**Why Critical**:
- Without this, users can't trade illiquid pairs
- Competitors (Uniswap, 1inch) all have this
- Major UX differentiator

---

#### D. Position Info for NFT Holders
**What Frontend Needs**:
```rust
// Get position details including unclaimed fees
pub fn get_position_details(&self, token_id: u64) -> PositionDetails;

pub struct PositionDetails {
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: U128,
    pub tokens_owed_0: U128,
    pub tokens_owed_1: U128,
    pub fees_earned_0: U128,  // Unclaimed fees
    pub fees_earned_1: U128,
}

// Get all positions owned by address
pub fn get_positions_by_owner(&self, owner: Address) -> Vec<u64>;
```

**Current State**: ⚠️ Partial - `get_position()` exists but no fee calculation, no owner query

---

#### E. TVL & Volume Stats
**What Frontend Needs**:
```rust
// Total Value Locked
pub fn get_tvl(&self) -> U256;

// Pool-specific stats
pub fn get_pool_stats(&self, token0: Address, token1: Address, fee: u32) -> PoolStats;

pub struct PoolStats {
    pub tvl_usd: U256,
    pub volume_24h: U256,
    pub fees_24h: U256,
    pub apr: u32,  // In basis points
}
```

**Current State**: ❌ Not implemented - would need oracle integration + storage

---

## ✅ WHAT'S WORKING WELL

### 1. **Math Libraries** (Excellent)
- ✅ TickMath: Proven Uniswap V3 formulas
- ✅ SqrtPriceMath: Correct rounding modes
- ✅ FullMath: Safe overflow handling
- ✅ Tests passing

### 2. **Events** (Good for Casper Live/Click)
```rust
✅ PoolCreated   - Track new pools
✅ Initialize    - Track pool price initialization
✅ Mint          - Track liquidity adds
✅ Burn          - Track liquidity removes
✅ Collect       - Track fee collection
✅ Swap          - Track trades (when implemented)
```

**Frontend Integration**:
```typescript
// Example: Casper Click event listener
casperClick.on('PoolCreated', (event) => {
  const { token0, token1, fee, pool } = event.data;
  updatePoolsList({ token0, token1, fee, pool });
});

casperClick.on('Swap', (event) => {
  const { sender, recipient, amount0, amount1, sqrt_price_x96, tick } = event.data;
  updatePriceChart({ price: sqrtPriceToHuman(sqrt_price_x96), tick });
});
```

### 3. **Token Ordering** (Correct)
- ✅ Always orders token0 < token1
- ✅ Prevents duplicate pools

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Fix Critical Bugs (3-5 days)
**Priority**: 🔴 CRITICAL - Must complete before mainnet

1. **Implement Real Swap Logic** (2 days)
   - [ ] Port Uniswap V3 swap loop
   - [ ] Tick crossing logic
   - [ ] Fee accumulation
   - [ ] Price impact calculations
   - [ ] Test with edge cases

2. **Implement `_modify_position`** (2 days)
   - [ ] Calculate token amounts using SqrtPriceMath
   - [ ] Update tick data
   - [ ] Update global liquidity
   - [ ] Track fee growth
   - [ ] Test roundtrip (mint → burn → collect)

3. **Fix Position Manager Liquidity** (1 day)
   - [ ] Calculate liquidity from desired amounts
   - [ ] Implement slippage checks
   - [ ] Test min amount enforcement

**Files to Edit**:
- [unified_dex.rs:324-386](../smart-contract/dex-contracts/src/unified_dex.rs)
- [unified_position_manager.rs:58](../smart-contract/dex-contracts/src/unified_position_manager.rs)

---

### Phase 2: Essential Frontend Functions (2-3 days)
**Priority**: 🟡 HIGH - Needed for usable UI

1. **Pool Discovery** (1 day)
   - [ ] Add pool registry (Vec or separate Mapping)
   - [ ] Implement `get_all_pools(offset, limit)`
   - [ ] Implement `get_pools_by_token(token)`
   - [ ] Add pool count getter

2. **Quote Function** (1 day)
   - [ ] Implement `quote_exact_input_single`
   - [ ] Implement `quote_exact_output_single`
   - [ ] Return price impact calculation
   - [ ] Test quote accuracy vs actual swap

3. **Position Queries** (1 day)
   - [ ] Implement `get_positions_by_owner`
   - [ ] Calculate unclaimed fees in `get_position_details`
   - [ ] Add position count per owner
   - [ ] Test with multiple positions

**New Files to Create**:
- `src/quoter.rs` - Separate read-only quote logic
- `src/pool_registry.rs` - Track all pools efficiently

---

### Phase 3: Multi-Hop Router (3-4 days)
**Priority**: 🟡 HIGH - Major UX feature

1. **Router Contract** (2 days)
   - [ ] Create new `router.rs` contract
   - [ ] Implement `swap_exact_input_multi_hop`
   - [ ] Implement `swap_exact_output_multi_hop`
   - [ ] Add deadline checks
   - [ ] Test 2-hop and 3-hop swaps

2. **Path Finding** (2 days)
   - [ ] Off-chain: Frontend calculates routes
   - [ ] On-chain: Validate path exists
   - [ ] Price impact across hops
   - [ ] Test with complex routes

**New File**:
- `smart-contract/router-contracts/src/router.rs`

---

### Phase 4: Advanced Features (Optional, 3-5 days)

1. **TWAP Oracle** (2 days)
   - [ ] Use existing `observations` storage
   - [ ] Implement `observe()` function
   - [ ] Update observations on swap
   - [ ] Test TWAP accuracy

2. **Flash Swaps** (2 days)
   - [ ] Implement callback pattern
   - [ ] Fee verification
   - [ ] Security tests

3. **Limit Orders** (1 day)
   - [ ] Use tick ranges for limit orders
   - [ ] Event on execution
   - [ ] UI integration

---

## 📐 ARCHITECTURE IMPROVEMENTS

### Storage Optimization

**Current**:
```rust
// Nested mappings - expensive on Casper
tick_bitmaps: Mapping<[u8; 32], Mapping<i16, U256>>
```

**Optimized**:
```rust
// Flattened key - cheaper reads/writes
tick_bitmaps: Mapping<([u8; 32], i16), U256>
```

### Pool Registry (for get_all_pools)

```rust
#[odra::module]
pub struct UnifiedDex {
    // ... existing fields ...

    // NEW: Track all pools for discovery
    pool_ids: Var<Vec<[u8; 32]>>,
    pool_count: Var<u32>,
}

impl UnifiedDex {
    pub fn create_pool(...) -> [u8; 32] {
        // ... existing code ...

        // Add to registry
        let mut pool_ids = self.pool_ids.get_or_default();
        pool_ids.push(pool_id);
        self.pool_ids.set(pool_ids);

        let count = self.pool_count.get_or_default();
        self.pool_count.set(count + 1);

        pool_id
    }

    pub fn get_all_pools(&self, offset: u32, limit: u32) -> Vec<PoolData> {
        let pool_ids = self.pool_ids.get_or_default();
        let start = offset as usize;
        let end = (offset + limit) as usize;

        pool_ids[start..end]
            .iter()
            .filter_map(|pool_id| {
                // Reverse lookup pool data from ID
                // ... implementation ...
            })
            .collect()
    }
}
```

---

## 🔒 SECURITY RECOMMENDATIONS

### 1. Reentrancy Protection
**Current**: ✅ Odra framework handles this via session isolation

### 2. Integer Overflow
**Current**: ✅ Rust's type system + assert checks prevent most issues

### 3. Access Control
**Current**: ⚠️ Missing admin functions for emergency pause

**Add**:
```rust
use odra_modules::access::Pausable;

#[odra::module]
pub struct UnifiedDex {
    pausable: SubModule<Pausable>,
    // ...
}

impl UnifiedDex {
    pub fn swap(...) {
        self.pausable.assert_not_paused();
        // ... swap logic ...
    }
}
```

### 4. Use Cryptographic Hashes
**Replace**:
```rust
// XOR-based hashing
fn compute_pool_id(...) -> [u8; 32] {
    // ... XOR loop ...
}
```

**With**:
```rust
use odra::casper_types::crypto::blake2b;

fn compute_pool_id(token0: Address, token1: Address, fee: u32) -> [u8; 32] {
    let mut key_bytes = Vec::new();
    key_bytes.extend_from_slice(&token0.to_bytes().unwrap());
    key_bytes.extend_from_slice(&token1.to_bytes().unwrap());
    key_bytes.extend_from_slice(&fee.to_le_bytes());

    blake2b(&key_bytes)
}
```

---

## 📋 TESTING CHECKLIST

### Unit Tests (Per Function)
- [ ] Swap: Zero amount, max amount, reverse direction
- [ ] Mint: Min tick, max tick, overlapping ranges
- [ ] Burn: Partial burn, full burn, burn more than owned
- [ ] Collect: Collect 0, collect max, collect twice
- [ ] Tick crossing: Cross 1 tick, cross 100 ticks
- [ ] Fee accumulation: Verify fee math, multiple LPs

### Integration Tests (End-to-End)
- [ ] Create pool → Initialize → Add liquidity → Swap → Remove liquidity
- [ ] Multi-user: 2 LPs add liquidity, swap, both collect fees
- [ ] Multi-hop: Create 3 pools, route through all
- [ ] Edge cases: Swap with 0 liquidity, swap beyond max tick

### Fuzzing (Recommended)
- [ ] Random swap amounts
- [ ] Random tick ranges
- [ ] Random fee tiers

---

## 🎨 FRONTEND INTEGRATION GUIDE

### 1. Connect to Contracts (Casper Click)

```typescript
import { CasperClient, CLPublicKey } from 'casper-js-sdk';

const client = new CasperClient('https://node.testnet.casper.network');

const DEX_CONTRACT = 'hash-9b94d531ff41c5f9c54849f30e5310b349e58c5a189da3039407eb7241e253b0';
const POSITION_MANAGER = 'hash-fa148c2e9d27ab7a2eac9a6ad0417aedf516f90a316d912327f4d1dd8e47f6ff';

// Get pool info
async function getPool(token0, token1, fee) {
  const result = await client.queryContractData(
    DEX_CONTRACT,
    'get_pool',
    [token0, token1, fee]
  );
  return result;
}
```

### 2. Listen to Events (Casper Live)

```typescript
import { EventStream } from '@casper-live/sdk';

const stream = new EventStream('https://event.testnet.casper.network');

// Listen for swaps
stream.on('event', (event) => {
  if (event.contract === DEX_CONTRACT && event.name === 'Swap') {
    const { sender, amount0, amount1, sqrt_price_x96, tick } = event.data;

    // Update price chart
    updateChart({
      timestamp: event.timestamp,
      price: sqrtPriceToHuman(sqrt_price_x96),
      volume: amount0 + amount1,
    });
  }
});
```

### 3. Execute Swap

```typescript
import { DeployUtil } from 'casper-js-sdk';

async function executeSwap(tokenIn, tokenOut, fee, amountIn, amountOutMin) {
  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      userPublicKey,
      'casper-test'
    ),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      DEX_CONTRACT,
      'swap',
      [
        CLValueBuilder.key(tokenIn),
        CLValueBuilder.key(tokenOut),
        CLValueBuilder.u32(fee),
        CLValueBuilder.key(userAddress),
        CLValueBuilder.bool(true),  // zero_for_one
        CLValueBuilder.i64(amountIn),
        CLValueBuilder.u256(0),  // No price limit
      ]
    ),
    DeployUtil.standardPayment(5_000_000_000)  // 5 CSPR gas
  );

  const signedDeploy = deploy.sign([userKeyPair]);
  const deployHash = await client.putDeploy(signedDeploy);

  return deployHash;
}
```

### 4. Display Pool List

```typescript
// After implementing get_all_pools()
async function loadPools() {
  const pools = await client.queryContractData(
    DEX_CONTRACT,
    'get_all_pools',
    [0, 100]  // offset, limit
  );

  return pools.map(pool => ({
    pair: `${getTokenSymbol(pool.token0)}/${getTokenSymbol(pool.token1)}`,
    fee: pool.fee / 10000 + '%',  // 3000 → 0.3%
    tvl: calculateTVL(pool.liquidity, pool.sqrt_price_x96),
    apr: calculateAPR(pool.fee_growth_global_0_x128, pool.liquidity),
  }));
}
```

---

## 📊 COMPARISON: Current vs. Needed

| Feature | Current | Needed for Production | Priority |
|---------|---------|----------------------|----------|
| **Swap Logic** | ❌ Placeholder | ✅ Full V3 implementation | 🔴 CRITICAL |
| **Liquidity Math** | ❌ Returns 0 | ✅ SqrtPriceMath integration | 🔴 CRITICAL |
| **Pool Discovery** | ❌ None | ✅ get_all_pools, pagination | 🟡 HIGH |
| **Swap Quotes** | ❌ None | ✅ quote_exact_input | 🟡 HIGH |
| **Multi-hop Router** | ❌ None | ✅ 2-3 hop support | 🟡 HIGH |
| **Position Queries** | ⚠️ Basic | ✅ Unclaimed fees, owner index | 🟡 HIGH |
| **Events** | ✅ Good | ✅ Already good | ✅ Done |
| **Math Libraries** | ✅ Excellent | ✅ Already excellent | ✅ Done |
| **TWAP Oracle** | ⚠️ Partial | ✅ observe() function | 🟢 MEDIUM |
| **Flash Swaps** | ❌ None | ✅ Nice to have | 🟢 LOW |

---

## 🏁 RECOMMENDED NEXT STEPS

### Immediate (This Week)
1. **Fix swap() function** - Implement real V3 swap logic
2. **Fix _modify_position()** - Implement liquidity calculations
3. **Add get_all_pools()** - Enable pool discovery

### Short-term (Next 2 Weeks)
4. **Implement quoter** - Quote swaps without execution
5. **Build multi-hop router** - Enable indirect swaps
6. **Add position fee calculations** - Show unclaimed rewards

### Medium-term (Next Month)
7. **TWAP oracle** - Price feeds for other protocols
8. **Flash swaps** - Advanced DeFi strategies
9. **Governance token** - Liquidity mining rewards

---

## 💡 TIPS FOR FRONTEND DEVELOPERS

### 1. Price Conversion
```typescript
// Convert sqrt_price_x96 to human-readable price
function sqrtPriceToHuman(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
  return Number(price) / 1e18;  // Adjust for token decimals
}
```

### 2. Fee Tier Display
```typescript
const FEE_TIERS = {
  500: '0.05%',   // Stablecoin pairs
  3000: '0.3%',   // Standard pairs
  10000: '1%',    // Exotic pairs
};
```

### 3. Tick to Price
```typescript
function tickToPrice(tick: number): number {
  return 1.0001 ** tick;
}
```

### 4. Gas Estimation
```
create_pool: ~3 CSPR
initialize_pool: ~2 CSPR
mint (add liquidity): ~5 CSPR
swap: ~4 CSPR
burn (remove liquidity): ~4 CSPR
collect: ~3 CSPR
```

---

## 📞 SUPPORT & RESOURCES

- **Odra Docs**: https://odra.io
- **Casper Click**: https://github.com/casper-ecosystem/casper-click
- **Casper Live**: https://cspr.live
- **Uniswap V3 Whitepaper**: https://uniswap.org/whitepaper-v3.pdf

---

## ✅ CONCLUSION

**Overall Assessment**:
- Math foundation: ⭐⭐⭐⭐⭐ Excellent
- Core logic: ⭐⭐☆☆☆ Needs work
- Frontend readiness: ⭐⭐☆☆☆ Missing key features

**Priority**: Fix critical swap + liquidity bugs FIRST, then add frontend integration functions.

**Estimated Time to Production**:
- Minimum viable (single-hop swaps): 1-2 weeks
- Full featured (multi-hop + quotes): 3-4 weeks
- Polished (TWAP + flash swaps): 5-6 weeks

Good luck! 🚀
