# CasperSwap V3: Pool Deployment Pattern Analysis

## Executive Summary

Based on analysis of:
1. **CEP-86 Factory Pattern** - Casper's native factory support
2. **Odra `#[module(factory=on)]`** - Odra's factory code generation
3. **Current Implementation** - Manual pool registration pattern

**Conclusion**: The current **manual registration pattern is correct** for DEX use cases. Here's why:

---

## Why `#[odra::module(factory=on)]` CANNOT Work for DEX Pools

### What Odra Factory Actually Generates

When you write `#[odra::module(factory=on)]` on Pool, Odra generates:

```rust
// Generated automatically:
- Pool (the actual contract)
- PoolFactory (deployment-only contract)
- PoolFactoryContractRef (typed caller)
```

### Critical Limitations

#### 1. **No Registry** ❌
```rust
// PoolFactory has NO storage
// Each pool deployment is independent
// No way to query "give me USDC/CSPR pool"
```

#### 2. **No Uniqueness Enforcement** ❌
```rust
// Can deploy USDC/CSPR pool 10 times
// No validation of duplicates
// No canonical pool concept
```

#### 3. **Ownership Issues** ⚠️
```rust
// Pool.init() sees caller = FactoryContract
// Not the actual user
// Breaks permission model
```

#### 4. **Cannot Add Custom Logic** ❌
```rust
// PoolFactory.new_contract() is auto-generated
// Cannot validate:
//   - Fee tiers
//   - Token ordering (token0 < token1)
//   - Pool already exists
```

---

## How Uniswap V3 Factory Works (Solidity)

### On-Chain Pool Creation

```solidity
function createPool(address tokenA, address tokenB, uint24 fee)
    external returns (address pool)
{
    // 1. Validate & order tokens
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

    // 2. Check pool doesn't exist
    require(getPool[token0][token1][fee] == address(0), "Pool exists");

    // 3. Deploy pool contract ON-CHAIN
    pool = address(new Pool{salt: keccak256(...)}(factory, token0, token1, fee));

    // 4. Store in registry
    getPool[token0][token1][fee] = pool;

    emit PoolCreated(token0, token1, fee, pool);
}
```

**Key**: Uses Solidity's `new` keyword with CREATE2 for deterministic addresses

---

## Casper's CEP-86 Factory Pattern

### What CEP-86 Provides

From [CEP-86 spec](https://github.com/mpapierski/ceps/blob/factory-pattern/text/0086-factory-pattern.md):

```rust
// EntryPointType::Install - can deploy contracts
// EntryPointAccess::Abstract - cannot be called directly

// Example:
#[entry_point(type = "Install")]
pub fn deploy_counter() {
    // Uses Casper's host function to deploy
    // All children share SAME bytecode as parent
}
```

### Critical Limitation

> "You can't load a bytecode into the Wasm, modify it, and create new modified smart contract."

**Impact for DEX**:
- ✅ Can deploy multiple Pool instances
- ❌ **ALL pools must share EXACT same WASM bytecode**
- ❌ Cannot customize pool parameters at bytecode level
- ✅ BUT can customize via `init()` parameters

---

## Current Implementation: Manual Registration Pattern

### The Solution (Already Implemented)

Located in `smart-contract/dex-contracts/FACTORY_SOLUTION.md`:

```rust
// Factory.rs
pub fn create_pool(token_a, token_b, fee) -> PoolCreationArgs {
    // Returns init args, does NOT deploy
}

pub fn register_pool(pool_address, token_a, token_b, fee) {
    // Owner-only: Register externally deployed pool
    self.pools.set((token0, token1, fee), pool_address);
}
```

### Why This Pattern Works

#### ✅ **Full Registry Support**
```rust
pools: Mapping<(Address, Address, u32), Address>
// Can query: get_pool(USDC, CSPR, 3000)
```

#### ✅ **Uniqueness Enforcement**
```rust
assert!(self.pools.get(&pool_key).is_none(), "Pool already exists");
```

#### ✅ **Security**
```rust
self.ownable.assert_owner(&self.env().caller());
// Only factory owner can register
```

#### ✅ **Proper Validation**
```rust
// Validate fee tier enabled
// Validate token0 < token1
// Validate no zero addresses
```

---

## Deployment Workflow Comparison

### ❌ Broken: Odra Factory Pattern

```rust
// 1. Deploy PoolFactory
let factory = PoolFactory::deploy(&env, NoArgs);

// 2. Deploy pool via factory
let (pool_addr, _) = factory.new_contract(token0, token1, fee);

// ❌ PROBLEM: Cannot query this pool later
// ❌ PROBLEM: Can deploy duplicates
// ❌ PROBLEM: No validation logic
```

### ✅ Current: Manual Registration

```rust
// 1. Get init args from factory
let pool_args = factory.create_pool(token0, token1, 3000);

// 2. Deploy Pool.wasm externally
casper-client put-deploy \
  --session-path Pool.wasm \
  --session-arg "factory:..." \
  --session-arg "token0:..." \
  --session-arg "token1:..." \
  --session-arg "fee:u32='3000'" \
  --session-arg "tick_spacing:i32='60'"

// 3. Initialize pool
pool.initialize(sqrt_price_x96);

// 4. Register with factory
factory.register_pool(pool_address, token0, token1, 3000);

// ✅ NOW: Pool is in registry
// ✅ NOW: Can query via factory.get_pool()
```

---

## Could We Use CEP-86 Directly?

### Theoretical Implementation

```rust
#[odra::module]
pub struct Factory {
    pools: Mapping<(Address, Address, u32), Address>,
}

impl Factory {
    // Using Casper's new_contract() host function
    pub fn create_pool(&mut self, token_a, token_b, fee) -> Address {
        // 1. Validate
        assert!(self.pools.get(&(token0, token1, fee)).is_none());

        // 2. Deploy using CEP-86 mechanism
        let pool_address = self.env().new_contract(
            pool_wasm_bytes,  // ❌ WHERE DO WE GET THIS?
            pool_init_args
        );

        // 3. Store
        self.pools.set((token0, token1, fee), pool_address);

        pool_address
    }
}
```

### The Blocker: Wasm Bytes

**Problem**: Odra doesn't provide a way to:
1. Load Pool.wasm bytes into Factory contract
2. Call `env().new_contract()` with those bytes
3. Store 200KB+ WASM in Factory storage

**Odra's Position**: Use `#[module(factory=on)]` OR deploy manually

---

## Alternative Considered: Factory Proxy Pattern

From ModuleFactory.md Example 2:

```rust
#[odra::module]
pub struct FactoryProxy {
    factory_address: Var<Address>
}

impl FactoryProxy {
    pub fn deploy_new_contract(&self) -> Address {
        let mut factory = PoolFactoryContractRef::new(...);
        let (addr, _) = factory.new_contract(...);

        // ❌ STILL NO REGISTRY
        // ❌ STILL NO VALIDATION

        addr
    }
}
```

**Verdict**: Doesn't solve core problem

---

## Why Manual Registration is BEST for DEX

### Comparison Table

| Requirement | Odra Factory | CEP-86 Direct | **Manual Registration** |
|-------------|--------------|---------------|-------------------------|
| Pool Registry | ❌ None | ✅ Custom | ✅ **Full Mapping** |
| Uniqueness | ❌ No | ✅ Yes | ✅ **Enforced** |
| Validation | ❌ No | ⚠️ Limited | ✅ **Full Control** |
| Security | ⚠️ Anyone | ✅ Custom | ✅ **Owner-Only** |
| Odra Support | ✅ Built-in | ❌ Not exposed | ✅ **Works Now** |
| Gas Cost | Low | Medium | **Medium** |
| Frontend UX | ❌ Complex | ❌ Very Complex | ✅ **Clear Steps** |

---

## Frontend Integration Strategy

### Step-by-Step User Flow

```typescript
// 1. User fills form: token0, token1, fee, initial_price

// 2. Call factory.create_pool() - Returns PoolCreationArgs
const tx1 = factory.create_pool(token0, token1, 3000);
await signAndSend(tx1);
const poolArgs = readFromChain(tx1);

// 3. BACKEND: Deploy Pool.wasm with poolArgs
//    (Frontend cannot upload 200KB WASM files)
const poolAddress = await backend.deployPool(poolArgs);

// 4. User calls pool.initialize(sqrt_price_x96)
const tx2 = pool.initialize(calculateSqrtPriceX96(1.0));
await signAndSend(tx2);

// 5. Factory owner registers pool
const tx3 = factory.register_pool(poolAddress, token0, token1, 3000);
await signAndSend(tx3);

// ✅ Pool is now live and queryable
```

### Required Components

1. **Backend Service** (cannot avoid this)
   - Hosts Pool.wasm binary
   - Deploys pools via casper-client
   - Returns deployed pool address

2. **Frontend UI**
   - Pool creation form
   - Price calculator (sqrt(price) * 2^96)
   - Transaction signing flow
   - Status tracking

3. **Factory Owner Automation** (optional)
   - Auto-register pools after deployment
   - Or: Make registration permissionless (risky)

---

## Recommendation: Keep Current Pattern

### Why It's Optimal

1. **Works with Odra 2.4.0** - No experimental features
2. **Full Control** - Validate everything
3. **Secure** - Owner-only registration
4. **Queryable** - Complete pool registry
5. **Auditable** - Clear deployment steps

### What to Build in Frontend

```typescript
// dex/config.ts
const FACTORY_HASH = 'da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9';

// dex/poolDeployment.tsx
<PoolCreationWizard>
  <Step1: GetPoolArgs />      {/* Call factory.create_pool() */}
  <Step2: DeployPool />        {/* Backend API call */}
  <Step3: InitializePool />    {/* User signs tx */}
  <Step4: RegisterPool />      {/* Owner signs tx */}
</PoolCreationWizard>

// dex/poolInfo.tsx
<PoolInfoDisplay>
  {/* Query factory.get_pool() */}
  {/* Query pool.slot0() for price */}
  {/* Query pool.liquidity() */}
</PoolInfoDisplay>
```

---

## Sources

1. [CEP-86 Factory Pattern Spec](https://github.com/mpapierski/ceps/blob/factory-pattern/text/0086-factory-pattern.md)
2. [Odra Framework Docs](https://odra.dev/docs/)
3. [Casper Developer Portal](https://developer.casper.network/)
4. Current implementation: `smart-contract/dex-contracts/FACTORY_SOLUTION.md`
5. Odra factory examples: `smart-contract/dex-contracts/ModuleFactory.md`

---

## Next Steps

1. ✅ **Keep current manual registration pattern**
2. 🔨 **Build frontend components** for pool creation wizard
3. 🔨 **Build backend service** for Pool.wasm deployment
4. 🔨 **Build pool info display** component
5. ⏳ **Future**: Petition Odra team to expose `env().new_contract()` API
