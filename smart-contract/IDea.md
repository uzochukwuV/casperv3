CasperSwap V3: Concentrated Liquidity DEX Architecture
Executive Summary
What Makes This Unique:
✅ First V3-style DEX on Casper (concentrated liquidity)
✅ 4000x capital efficiency vs traditional AMMs
✅ Production-ready patterns from your lottery contract
✅ Odra 2.4.0 optimized for Casper 2.0
Core Architecture: 3-Contract System
smart-contract/
├── dex-contracts/              # V3 Core (NEW)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── factory.rs          # Pool deployment
│   │   ├── pool.rs             # Core AMM with concentrated liquidity
│   │   ├── position_manager.rs # NFT-based position management
│   │   ├── math/
│   │   │   ├── tick_math.rs    # Tick ↔ Price conversions
│   │   │   ├── sqrt_price_math.rs  # Token amount calculations
│   │   │   ├── liquidity_math.rs   # Liquidity deltas
│   │   │   └── full_math.rs    # Safe 256-bit operations
│   │   ├── types/
│   │   │   ├── tick.rs         # Tick storage structure
│   │   │   ├── position.rs     # Position info
│   │   │   ├── pool_info.rs    # Pool state
│   │   │   └── events.rs       # Event definitions
│   │   └── storage/
│   │       ├── tick_bitmap.rs  # Efficient tick indexing
│   │       └── oracle.rs       # TWAP observations
│   ├── bin/
│   │   ├── build_contract.rs
│   │   └── build_schema.rs
│   └── Cargo.toml
├── router-contracts/           # Periphery (Phase 2)
│   └── src/
│       ├── router.rs           # Multi-hop swaps
│       └── quoter.rs           # Price quotes
├── token-contracts/            # CEP-18 Tokens (Testing)
│   └── src/
│       └── erc20.rs            # Standard token for testing
└── lottery-contracts/          # Existing (unchanged)
Mathematical Foundation
1. Tick System (Discrete Price Space)
Key Concept: Prices mapped to integer ticks for efficient storage
// From Uniswap V3
TICK_BASE = 1.0001
price = TICK_BASE^tick
price = 1.0001^tick

// Example:
tick = 0    → price = 1.0
tick = 100  → price = 1.0101 (1% higher)
tick = -100 → price = 0.9901 (1% lower)
Tick Spacing:
Fee 0.05% → tick_spacing = 10
Fee 0.30% → tick_spacing = 60
Fee 1.00% → tick_spacing = 200
Price Representation: Use Q96.64 fixed-point (96-bit fractional precision)
// Store sqrt(price) * 2^96
sqrtPriceX96 = sqrt(price) * (1 << 96)
2. Liquidity Math
Virtual Liquidity:
L = sqrt(x * y)  // Traditional AMM

L_concentrated = delta_y / (sqrt(P_upper) - sqrt(P))  // V3
Token Amounts in Range [P_lower, P_upper]:
amount0 = L * (sqrt(P_upper) - sqrt(P_lower)) / (sqrt(P_upper) * sqrt(P_lower))
amount1 = L * (sqrt(P_upper) - sqrt(P_lower))
3. Fee Accumulation (Per-Unit Liquidity)
// Global fee growth
feeGrowthGlobal0X128 += (feeAmount * Q128) / totalLiquidity

// Position-specific fees owed
feesOwed = liquidity * (feeGrowthGlobal - feeGrowthLastUpdated)
Contract 1: Pool (Core AMM)
State Structure
#[odra::module(events = [Mint, Burn, Swap, Flash], errors = PoolError)]
pub struct Pool {
    // Immutable configuration
    factory: Var<Address>,
    token0: Var<Address>,  // CEP-18 token
    token1: Var<Address>,  // CEP-18 token
    fee: Var<u32>,         // Fee in hundredths of a bip (e.g., 3000 = 0.3%)
    tick_spacing: Var<i32>,
    
    // Current state (Slot0 equivalent)
    sqrt_price_x96: Var<U256>,    // Current price as Q96.64
    tick: Var<i32>,                // Current tick
    liquidity: Var<U256>,          // Active liquidity
    
    // Fee tracking
    fee_growth_global_0_x128: Var<U256>,
    fee_growth_global_1_x128: Var<U256>,
    protocol_fees_token0: Var<U256>,
    protocol_fees_token1: Var<U256>,
    
    // Storage structures
    ticks: Mapping<i32, Tick>,              // tick → Tick info
    positions: Mapping<PositionKey, Position>, // hash(owner, lower, upper) → Position
    tick_bitmap: SubModule<TickBitmap>,     // Efficient tick iteration
    
    // Oracle
    observations: Mapping<u16, Observation>, // Circular buffer for TWAP
    observation_index: Var<u16>,
    observation_cardinality: Var<u16>,
    
    // Access control
    ownable: SubModule<Ownable>,
}
Key Functions
1. Initialize Pool
pub fn initialize(&mut self, sqrt_price_x96: U256) {
    // Set initial price
    self.sqrt_price_x96.set(sqrt_price_x96);
    self.tick.set(TickMath::get_tick_at_sqrt_ratio(sqrt_price_x96));
    self.observation_cardinality.set(1);
}
2. Mint Liquidity (Add Position)
pub fn mint(
    &mut self,
    recipient: Address,
    tick_lower: i32,
    tick_upper: i32,
    amount: U256,
) -> (U256, U256) {  // Returns (amount0, amount1) required
    // Validate tick range
    assert!(tick_lower < tick_upper);
    assert!(tick_lower % self.tick_spacing.get() == 0);
    
    // Update position
    let position_key = PositionKey::new(recipient, tick_lower, tick_upper);
    let mut position = self.positions.get_or_default(&position_key);
    
    // Calculate token amounts required
    let (amount0, amount1) = self._modify_position(
        position_key,
        tick_lower,
        tick_upper,
        amount.as_i256(),  // Positive for mint
    );
    
    // Transfer tokens from sender (via callback or direct)
    self.collect_tokens(recipient, amount0, amount1);
    
    self.env().emit_event(Mint {
        sender: self.env().caller(),
        owner: recipient,
        tick_lower,
        tick_upper,
        amount,
        amount0,
        amount1,
    });
    
    (amount0, amount1)
}
3. Burn Liquidity (Remove Position)
pub fn burn(
    &mut self,
    tick_lower: i32,
    tick_upper: i32,
    amount: U256,
) -> (U256, U256) {  // Returns (amount0, amount1) owed
    let caller = self.env().caller();
    let position_key = PositionKey::new(caller, tick_lower, tick_upper);
    
    // Calculate tokens owed
    let (amount0, amount1) = self._modify_position(
        position_key,
        tick_lower,
        tick_upper,
        -(amount.as_i256()),  // Negative for burn
    );
    
    // Update tokens owed (don't transfer yet - use collect())
    let mut position = self.positions.get(&position_key).unwrap();
    position.tokens_owed_0 += amount0;
    position.tokens_owed_1 += amount1;
    self.positions.set(&position_key, position);
    
    (amount0, amount1)
}
4. Collect Fees/Tokens
pub fn collect(
    &mut self,
    recipient: Address,
    tick_lower: i32,
    tick_upper: i32,
    amount0_requested: U256,
    amount1_requested: U256,
) -> (U256, U256) {
    let caller = self.env().caller();
    let position_key = PositionKey::new(caller, tick_lower, tick_upper);
    let mut position = self.positions.get(&position_key).unwrap();
    
    // Calculate actual amounts to collect
    let amount0 = min(amount0_requested, position.tokens_owed_0);
    let amount1 = min(amount1_requested, position.tokens_owed_1);
    
    // Update position
    position.tokens_owed_0 -= amount0;
    position.tokens_owed_1 -= amount1;
    self.positions.set(&position_key, position);
    
    // Transfer tokens
    self.transfer_token(self.token0.get(), recipient, amount0);
    self.transfer_token(self.token1.get(), recipient, amount1);
    
    (amount0, amount1)
}
5. Swap (Core Trading)
pub fn swap(
    &mut self,
    recipient: Address,
    zero_for_one: bool,      // true = token0 → token1
    amount_specified: i256,  // Positive = exact input, Negative = exact output
    sqrt_price_limit_x96: U256,
) -> (i256, i256) {  // Returns (amount0, amount1) - negative = sent to user
    
    // Cache state
    let mut state = SwapState {
        amount_specified_remaining: amount_specified,
        amount_calculated: 0,
        sqrt_price_x96: self.sqrt_price_x96.get(),
        tick: self.tick.get(),
        liquidity: self.liquidity.get(),
    };
    
    // Loop through ticks until amount is exhausted or price limit reached
    while state.amount_specified_remaining != 0 
        && state.sqrt_price_x96 != sqrt_price_limit_x96 {
        
        // Find next initialized tick
        let step_tick_next = self.tick_bitmap.next_initialized_tick(
            state.tick,
            tick_spacing,
            zero_for_one,
        );
        
        // Compute swap within current tick range
        let step = SqrtPriceMath::compute_swap_step(
            state.sqrt_price_x96,
            step_tick_next.sqrt_price_x96,
            state.liquidity,
            state.amount_specified_remaining,
            self.fee.get(),
        );
        
        // Update state
        state.sqrt_price_x96 = step.sqrt_price_next_x96;
        state.amount_specified_remaining -= step.amount_in + step.fee_amount;
        state.amount_calculated += step.amount_out;
        
        // Update global fee growth
        if step.fee_amount > 0 {
            let fee_growth_delta = (step.fee_amount * Q128) / state.liquidity;
            if zero_for_one {
                self.fee_growth_global_0_x128.add(fee_growth_delta);
            } else {
                self.fee_growth_global_1_x128.add(fee_growth_delta);
            }
        }
        
        // Cross tick if needed
        if state.sqrt_price_x96 == step_tick_next.sqrt_price_x96 {
            state.liquidity = self._cross_tick(step_tick_next.tick, zero_for_one);
            state.tick = zero_for_one ? step_tick_next.tick - 1 : step_tick_next.tick;
        } else {
            state.tick = TickMath::get_tick_at_sqrt_ratio(state.sqrt_price_x96);
        }
    }
    
    // Update global state
    self.sqrt_price_x96.set(state.sqrt_price_x96);
    self.tick.set(state.tick);
    self.liquidity.set(state.liquidity);
    
    // Calculate final amounts
    let (amount0, amount1) = if zero_for_one {
        (amount_specified - state.amount_specified_remaining, state.amount_calculated)
    } else {
        (state.amount_calculated, amount_specified - state.amount_specified_remaining)
    };
    
    // Execute token transfers
    self.transfer_tokens_for_swap(recipient, amount0, amount1, zero_for_one);
    
    self.env().emit_event(Swap {
        sender: self.env().caller(),
        recipient,
        amount0,
        amount1,
        sqrt_price_x96: state.sqrt_price_x96,
        liquidity: state.liquidity,
        tick: state.tick,
    });
    
    (amount0, amount1)
}
Contract 2: Position Manager (NFT Wrapper)
Why Separate from Pool?
Uniswap V3 Pattern: Pool manages raw liquidity, Position Manager tracks ownership
Gas Optimization: Pool stays lightweight
Flexibility: Users can interact with pool directly OR via manager
State Structure
#[odra::module(events = [IncreaseLiquidity, DecreaseLiquidity, Collect, Transfer])]
pub struct PositionManager {
    // NFT metadata
    next_token_id: Var<U256>,
    owners: Mapping<U256, Address>,           // token_id → owner
    balances: Mapping<Address, U256>,         // owner → count
    token_approvals: Mapping<U256, Address>,  // token_id → approved
    
    // Position data
    positions: Mapping<U256, PositionData>,   // token_id → position info
    
    // Pool reference
    factory: Var<Address>,
}

pub struct PositionData {
    pub pool: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: U256,
    pub fee_growth_inside_0_last_x128: U256,
    pub fee_growth_inside_1_last_x128: U256,
    pub tokens_owed_0: U256,
    pub tokens_owed_1: U256,
}
Key Functions
1. Mint Position (Create NFT + Add Liquidity)
pub fn mint(&mut self, params: MintParams) -> (U256, U256, U256, U256) {
    // Get pool address from factory
    let pool_address = self.get_pool(params.token0, params.token1, params.fee);
    let pool = PoolRef::new(self.env(), pool_address);
    
    // Add liquidity to pool
    let (amount0, amount1) = pool.mint(
        self.env().self_address(),  // Manager owns liquidity
        params.tick_lower,
        params.tick_upper,
        params.amount,
    );
    
    // Mint NFT to recipient
    let token_id = self.next_token_id.get();
    self.next_token_id.add(U256::one());
    self._mint(params.recipient, token_id);
    
    // Store position data
    self.positions.set(&token_id, PositionData {
        pool: pool_address,
        tick_lower: params.tick_lower,
        tick_upper: params.tick_upper,
        liquidity: params.amount,
        fee_growth_inside_0_last_x128: U256::zero(),
        fee_growth_inside_1_last_x128: U256::zero(),
        tokens_owed_0: U256::zero(),
        tokens_owed_1: U256::zero(),
    });
    
    (token_id, liquidity, amount0, amount1)
}
2. Increase Liquidity (Add to Existing Position)
pub fn increase_liquidity(
    &mut self,
    token_id: U256,
    amount0_desired: U256,
    amount1_desired: U256,
    amount0_min: U256,
    amount1_min: U256,
) -> (U256, U256, U256) {
    // Verify caller owns NFT
    assert_eq!(self.owners.get(&token_id).unwrap(), self.env().caller());
    
    let mut position = self.positions.get(&token_id).unwrap();
    let pool = PoolRef::new(self.env(), position.pool);
    
    // Calculate liquidity to add
    let liquidity_delta = LiquidityMath::get_liquidity_for_amounts(
        pool.sqrt_price_x96(),
        position.tick_lower,
        position.tick_upper,
        amount0_desired,
        amount1_desired,
    );
    
    // Add to pool
    let (amount0, amount1) = pool.mint(
        self.env().self_address(),
        position.tick_lower,
        position.tick_upper,
        liquidity_delta,
    );
    
    // Validate slippage
    assert!(amount0 >= amount0_min && amount1 >= amount1_min);
    
    // Update position
    position.liquidity += liquidity_delta;
    self.positions.set(&token_id, position);
    
    (liquidity_delta, amount0, amount1)
}
Contract 3: Factory
Purpose
Deploy new pools
Track all pools
Set protocol fee recipient
#[odra::module(events = [PoolCreated])]
pub struct Factory {
    ownable: SubModule<Ownable>,
    pools: Mapping<PoolKey, Address>,  // (token0, token1, fee) → pool address
    fee_amounts_enabled: Mapping<u32, bool>,  // Whitelist fees
}

pub fn create_pool(
    &mut self,
    token_a: Address,
    token_b: Address,
    fee: u32,
) -> Address {
    // Order tokens
    let (token0, token1) = if token_a < token_b {
        (token_a, token_b)
    } else {
        (token_b, token_a)
    };
    
    // Validate fee tier exists
    assert!(self.fee_amounts_enabled.get(&fee).unwrap_or(false));
    
    let pool_key = PoolKey { token0, token1, fee };
    
    // Check pool doesn't exist
    assert!(self.pools.get(&pool_key).is_none());
    
    // Deploy new pool
    let pool = Pool::deploy(
        self.env(),
        PoolInitArgs {
            factory: self.env().self_address(),
            token0,
            token1,
            fee,
            tick_spacing: self.get_tick_spacing(fee),
        },
    );
    
    self.pools.set(&pool_key, pool.address());
    
    self.env().emit_event(PoolCreated {
        token0,
        token1,
        fee,
        tick_spacing: self.get_tick_spacing(fee),
        pool: pool.address(),
    });
    
    pool.address()
}
Odra-Specific Adaptations
1. Mapping Storage (Replacing Solidity mappings)
// Solidity: mapping(int24 => Tick.Info) public ticks;
// Odra:
ticks: Mapping<i32, Tick>,

// Usage:
let tick_info = self.ticks.get_or_default(&tick);
self.ticks.set(&tick, updated_tick_info);
2. Cross-Contract Calls (CEP-18 Tokens)
Define external interface:
#[odra::external_contract]
pub trait Erc20 {
    fn transfer_from(&mut self, owner: Address, recipient: Address, amount: U256) -> bool;
    fn transfer(&mut self, recipient: Address, amount: U256) -> bool;
    fn balance_of(&self, account: Address) -> U256;
}

// Usage in Pool:
fn transfer_token(&self, token: Address, recipient: Address, amount: U256) {
    let token_contract = Erc20Ref::new(self.env(), token);
    token_contract.transfer(recipient, amount);
}

fn collect_tokens(&self, from: Address, amount0: U256, amount1: U256) {
    let token0_contract = Erc20Ref::new(self.env(), self.token0.get());
    let token1_contract = Erc20Ref::new(self.env(), self.token1.get());
    
    token0_contract.transfer_from(from, self.env().self_address(), amount0);
    token1_contract.transfer_from(from, self.env().self_address(), amount1);
}
3. Fixed-Point Math (Q96.64)
Solidity has native uint160 for sqrtPriceX96, Odra uses U256:
// Constants
const Q96: U256 = U256::from(1u128 << 96);  // 2^96
const Q128: U256 = U256::from(1u128 << 128); // 2^128

// Example: Convert tick to sqrtPriceX96
pub fn get_sqrt_ratio_at_tick(tick: i32) -> U256 {
    let abs_tick = tick.abs() as u32;
    
    // Use pre-computed values for 1.0001^(2^n)
    let mut ratio = if abs_tick & 0x1 != 0 {
        U256::from_str_radix("fffcb933bd6fad37aa2d162d1a594001", 16).unwrap()
    } else {
        U256::from(1u128 << 128)
    };
    
    if abs_tick & 0x2 != 0 {
        ratio = (ratio * U256::from_str_radix("fff97272373d413259a46990580e213a", 16).unwrap()) >> 128;
    }
    // ... continue for all powers of 2
    
    if tick > 0 {
        ratio = U256::MAX / ratio;
    }
    
    // Convert Q128.128 to Q96.64
    (ratio >> 32) + if ratio % (1 << 32) == 0 { 0 } else { 1 }
}
4. Tick Bitmap (Gas-Optimized Tick Search)
Solidity uses bit manipulation on uint256, adapt for Odra:
#[odra::module]
pub struct TickBitmap {
    bitmap: Mapping<i16, U256>,  // word_pos → bitmap (256 ticks per word)
}

impl TickBitmap {
    pub fn flip_tick(&mut self, tick: i32, tick_spacing: i32) {
        let (word_pos, bit_pos) = self.position(tick / tick_spacing);
        let mut word = self.bitmap.get_or_default(&word_pos);
        
        // Flip bit
        let mask = U256::one() << bit_pos;
        word ^= mask;
        
        self.bitmap.set(&word_pos, word);
    }
    
    pub fn next_initialized_tick(
        &self,
        tick: i32,
        tick_spacing: i32,
        lte: bool,  // Search <= (true) or > (false)
    ) -> (i32, bool) {
        let compressed = tick / tick_spacing;
        
        if lte {
            // Search right to left for next initialized tick
            let (word_pos, bit_pos) = self.position(compressed);
            let word = self.bitmap.get_or_default(&word_pos);
            
            // Mask bits <= current position
            let mask = (U256::one() << bit_pos) - U256::one() + (U256::one() << bit_pos);
            let masked = word & mask;
            
            if masked != U256::zero() {
                // Found in same word
                let bit_pos = self.most_significant_bit(masked);
                return ((word_pos * 256 + bit_pos) * tick_spacing, true);
            }
            // ... search previous words
        }
        // ... implementation continues
    }
    
    fn position(&self, tick: i32) -> (i16, u8) {
        let word_pos = (tick >> 8) as i16;  // Divide by 256
        let bit_pos = (tick % 256) as u8;
        (word_pos, bit_pos)
    }
}
Implementation Milestones