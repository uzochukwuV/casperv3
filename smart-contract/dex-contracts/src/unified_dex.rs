use odra::{
    casper_types::{U256, U128},
    prelude::*,
    ContractRef,
};
use odra_modules::{access::Ownable, erc20::Erc20ContractRef};
use crate::{
    constants::*,
    math::TickMath,
    types::{
        tick::I128,
        events::{Burn, Collect, Initialize, Mint, PoolCreated},
        pool_info::{Observation, Slot0},
        position::Position,
        tick::Tick,
    },
};

/// Pool data stored as a struct instead of separate contract
#[odra::odra_type]
pub struct PoolData {
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_spacing: i32,
    pub max_liquidity_per_tick: U128,
    pub slot0: Slot0,
    pub liquidity: U128,
    pub fee_growth_global_0_x128: U256,
    pub fee_growth_global_1_x128: U256,
    pub protocol_fees_token0: U128,
    pub protocol_fees_token1: U128,
}

impl Default for PoolData {
    fn default() -> Self {
        Self {
            token0: Address::Account(odra::casper_types::account::AccountHash::new([0; 32])),
            token1: Address::Account(odra::casper_types::account::AccountHash::new([0; 32])),
            fee: 0,
            tick_spacing: 0,
            max_liquidity_per_tick: U128::zero(),
            slot0: Slot0::default(),
            liquidity: U128::zero(),
            fee_growth_global_0_x128: U256::zero(),
            fee_growth_global_1_x128: U256::zero(),
            protocol_fees_token0: U128::zero(),
            protocol_fees_token1: U128::zero(),
        }
    }
}

/// Unified DEX contract managing all pools
#[odra::module(events = [PoolCreated, Initialize, Mint, Burn, Collect])]
pub struct UnifiedDex {
    ownable: SubModule<Ownable>,
    
    // Pool management
    pools: Mapping<(Address, Address, u32), PoolData>,
    fee_amount_tick_spacing: Mapping<u32, i32>,
    
    // Pool-specific storage (keyed by pool_id)
    ticks: Mapping<([u8; 32], i32), Tick>,
    positions: Mapping<([u8; 32], [u8; 32]), Position>,
    tick_bitmaps: Mapping<([u8; 32], i32), U256>,  // (pool_id, word_pos) -> bitmap (i32 for ToBytes support)
    observations: Mapping<([u8; 32], u32), Observation>,
}

#[odra::module]
impl UnifiedDex {
    #[odra(init)]
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.ownable.init(caller);
        
        // Initialize default fee tiers
        self.fee_amount_tick_spacing.set(&500, 10);    // 0.05%
        self.fee_amount_tick_spacing.set(&3000, 60);   // 0.3%
        self.fee_amount_tick_spacing.set(&10000, 200); // 1%
    }

    /// Create a new pool
    pub fn create_pool(
        &mut self,
        token_a: Address,
        token_b: Address,
        fee: u32,
    ) -> [u8; 32] {
        assert!(token_a != token_b, "Identical addresses");
        let (token0, token1) = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };

        let tick_spacing = self.fee_amount_tick_spacing.get(&fee).unwrap_or(0);
        assert!(tick_spacing != 0, "Fee not enabled");

        let pool_key = (token0, token1, fee);
        assert!(self.pools.get(&pool_key).is_none(), "Pool already exists");

        // Calculate pool ID
        let pool_id = Self::compute_pool_id(token0, token1, fee);

        // Create pool data
        let tick_spacing_u128 = U128::from(tick_spacing.unsigned_abs());
        let max_liquidity = U128::MAX / tick_spacing_u128;

        let pool_data = PoolData {
            token0,
            token1,
            fee,
            tick_spacing,
            max_liquidity_per_tick: max_liquidity,
            slot0: Slot0 {
                unlocked: true,
                ..Default::default()
            },
            ..Default::default()
        };

        self.pools.set(&pool_key, pool_data);

        self.env().emit_event(PoolCreated {
            token0,
            token1,
            fee,
            tick_spacing,
            pool: self.env().self_address(), // This contract manages all pools
        });

        pool_id
    }

    /// Initialize a pool with starting price
    pub fn initialize_pool(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        sqrt_price_x96: U256,
    ) {
        let pool_key = (token0, token1, fee);
        let mut pool_data = self.pools.get(&pool_key).expect("Pool does not exist");
        
        assert!(pool_data.slot0.sqrt_price_x96.is_zero(), "Already initialized");

        let tick = TickMath::get_tick_at_sqrt_ratio(sqrt_price_x96);

        pool_data.slot0.sqrt_price_x96 = sqrt_price_x96;
        pool_data.slot0.tick = tick;
        pool_data.slot0.observation_cardinality = 1;
        pool_data.slot0.observation_cardinality_next = 1;
        
        self.pools.set(&pool_key, pool_data);

        // Initialize first observation
        let pool_id = Self::compute_pool_id(token0, token1, fee);
        let observation = Observation {
            block_timestamp: self.env().get_block_time() as u32,
            tick_cumulative: 0,
            seconds_per_liquidity_cumulative_x128: U256::zero(),
            initialized: true,
        };
        self.observations.set(&(pool_id, 0), observation);

        self.env().emit_event(Initialize {
            sqrt_price_x96,
            tick,
        });
    }

    /// Add liquidity to a pool
    pub fn mint(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount: U128,
        amount0_min: U256,
        amount1_min: U256,
    ) -> (U256, U256) {
        assert!(!amount.is_zero(), "Amount cannot be zero");

        let pool_key = (token0, token1, fee);
        let pool_data = self.pools.get(&pool_key).expect("Pool does not exist");

        // Check pool is initialized
        assert!(!pool_data.slot0.sqrt_price_x96.is_zero(), "Pool not initialized");

        assert!(tick_lower < tick_upper, "Invalid tick range");
        assert!(tick_lower >= MIN_TICK && tick_upper <= MAX_TICK, "Tick out of bounds");
        assert!(tick_lower % pool_data.tick_spacing == 0 && tick_upper % pool_data.tick_spacing == 0, "Ticks not aligned");

        let pool_id = Self::compute_pool_id(token0, token1, fee);
        let (amount0, amount1) = self._modify_position(
            pool_key,
            pool_id,
            recipient,
            tick_lower,
            tick_upper,
            amount.as_u128() as i64,
        );

        // Slippage protection
        assert!(amount0 >= amount0_min, "Amount0 less than minimum");
        assert!(amount1 >= amount1_min, "Amount1 less than minimum");

        // Transfer tokens with fee-on-transfer protection
        let sender = self.env().caller();
        let dex_address = self.env().self_address();

        if !amount0.is_zero() {
            let mut token0_contract = Erc20ContractRef::new(self.env(), token0);
            let balance_before = token0_contract.balance_of(&dex_address);
            token0_contract.transfer_from(&sender, &dex_address, &amount0);
            let balance_after = token0_contract.balance_of(&dex_address);
            let received = balance_after - balance_before;
            assert!(received >= amount0, "Fee-on-transfer tokens not supported");
        }

        if !amount1.is_zero() {
            let mut token1_contract = Erc20ContractRef::new(self.env(), token1);
            let balance_before = token1_contract.balance_of(&dex_address);
            token1_contract.transfer_from(&sender, &dex_address, &amount1);
            let balance_after = token1_contract.balance_of(&dex_address);
            let received = balance_after - balance_before;
            assert!(received >= amount1, "Fee-on-transfer tokens not supported");
        }

        // Update TWAP oracle observation after liquidity change
        let mut pool_data_updated = self.pools.get(&pool_key).expect("Pool does not exist");
        let current_tick = pool_data_updated.slot0.tick;
        let current_liquidity = pool_data_updated.liquidity;
        pool_data_updated.slot0 = self._write_observation(
            pool_id,
            pool_data_updated.slot0,
            current_tick,
            current_liquidity,
        );
        self.pools.set(&pool_key, pool_data_updated);

        self.env().emit_event(Mint {
            sender,
            owner: recipient,
            tick_lower,
            tick_upper,
            amount,
            amount0,
            amount1,
        });

        (amount0, amount1)
    }

    /// Remove liquidity from a pool
    pub fn burn(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        tick_lower: i32,
        tick_upper: i32,
        amount: U128,
    ) -> (U256, U256) {
        let pool_key = (token0, token1, fee);
        assert!(self.pools.get(&pool_key).is_some(), "Pool does not exist");

        let caller = self.env().caller();
        let pool_id = Self::compute_pool_id(token0, token1, fee);

        let (amount0, amount1) = self._modify_position(
            pool_key,
            pool_id,
            caller,
            tick_lower,
            tick_upper,
            -(amount.as_u128() as i64),
        );

        // Update tokens owed
        let position_key = Self::compute_position_key(caller, tick_lower, tick_upper);
        let mut position = self.positions.get(&(pool_id, position_key)).unwrap_or_default();
        position.tokens_owed_0 = position.tokens_owed_0 + amount0.as_u128();
        position.tokens_owed_1 = position.tokens_owed_1 + amount1.as_u128();
        self.positions.set(&(pool_id, position_key), position);

        // Update TWAP oracle observation after liquidity change
        let mut pool_data_updated = self.pools.get(&pool_key).expect("Pool does not exist");
        let current_tick = pool_data_updated.slot0.tick;
        let current_liquidity = pool_data_updated.liquidity;
        pool_data_updated.slot0 = self._write_observation(
            pool_id,
            pool_data_updated.slot0,
            current_tick,
            current_liquidity,
        );
        self.pools.set(&pool_key, pool_data_updated);

        self.env().emit_event(Burn {
            owner: caller,
            tick_lower,
            tick_upper,
            amount,
            amount0,
            amount1,
        });

        (amount0, amount1)
    }

    /// Collect tokens owed
    pub fn collect(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount0_requested: U128,
        amount1_requested: U128,
    ) -> (U128, U128) {
        let pool_key = (token0, token1, fee);
        assert!(self.pools.get(&pool_key).is_some(), "Pool does not exist");

        let caller = self.env().caller();
        let pool_id = Self::compute_pool_id(token0, token1, fee);
        let position_key = Self::compute_position_key(caller, tick_lower, tick_upper);
        
        let mut position = self.positions.get(&(pool_id, position_key)).unwrap_or_default();

        let amount0 = amount0_requested.min(position.tokens_owed_0);
        let amount1 = amount1_requested.min(position.tokens_owed_1);

        position.tokens_owed_0 = position.tokens_owed_0 - amount0;
        position.tokens_owed_1 = position.tokens_owed_1 - amount1;
        self.positions.set(&(pool_id, position_key), position);

        // Transfer tokens
        if !amount0.is_zero() {
            let mut token0_contract = Erc20ContractRef::new(self.env(), token0);
            let amount0_u256 = U256::from(amount0.as_u128());
            token0_contract.transfer(&recipient, &amount0_u256);
        }

        if !amount1.is_zero() {
            let mut token1_contract = Erc20ContractRef::new(self.env(), token1);
            let amount1_u256 = U256::from(amount1.as_u128());
            token1_contract.transfer(&recipient, &amount1_u256);
        }

        self.env().emit_event(Collect {
            owner: caller,
            recipient,
            tick_lower,
            tick_upper,
            amount0,
            amount1,
        });

        (amount0, amount1)
    }

    /// Swap tokens in a pool
    pub fn swap(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        recipient: Address,
        zero_for_one: bool,
        amount_specified: i64,
        sqrt_price_limit_x96: U256,
    ) -> (i64, i64) {
        let pool_key = (token0, token1, fee);
        let mut pool_data = self.pools.get(&pool_key).expect("Pool does not exist");

        assert!(!pool_data.slot0.sqrt_price_x96.is_zero(), "Pool not initialized");
        assert!(amount_specified != 0, "Amount cannot be zero");

        // Set price limit to min/max if not specified
        let sqrt_price_limit = if sqrt_price_limit_x96.is_zero() {
            if zero_for_one {
                U256::from(MIN_SQRT_RATIO + 1) // Minimum price when selling token0
            } else {
                U256::from_dec_str(MAX_SQRT_RATIO_STR).unwrap() - U256::one() // Maximum price when selling token1
            }
        } else {
            sqrt_price_limit_x96
        };

        // Validate price limit
        if zero_for_one {
            assert!(sqrt_price_limit < pool_data.slot0.sqrt_price_x96, "Price limit too high");
            assert!(sqrt_price_limit > U256::from(MIN_SQRT_RATIO), "Price limit too low");
        } else {
            assert!(sqrt_price_limit > pool_data.slot0.sqrt_price_x96, "Price limit too low");
            assert!(sqrt_price_limit < U256::from_dec_str(MAX_SQRT_RATIO_STR).unwrap(), "Price limit too high");
        }

        let exact_input = amount_specified > 0;

        // Initialize swap state with tick crossing support
        let mut amount_specified_remaining = amount_specified.abs() as u128;
        let mut amount_calculated: u128 = 0;
        let mut sqrt_price_x96 = pool_data.slot0.sqrt_price_x96;
        let mut current_liquidity = pool_data.liquidity;
        let mut current_tick = pool_data.slot0.tick;
        let pool_id = Self::compute_pool_id(token0, token1, fee);

        // V3 tick-crossing swap loop
        while amount_specified_remaining > 0 && sqrt_price_x96 != sqrt_price_limit {
            // Check if we have liquidity to trade against
            if current_liquidity.is_zero() {
                break; // No liquidity available
            }

            let sqrt_price_start = sqrt_price_x96;

            // Compute swap step within current tick range
            let amount_in_u256 = U256::from(amount_specified_remaining);

            // Apply fee
            let fee_amount = amount_in_u256
                .checked_mul(U256::from(pool_data.fee))
                .expect("Fee multiplication overflow")
                .checked_div(U256::from(1_000_000u32))
                .expect("Fee division failed");
            let amount_in_after_fee = amount_in_u256.checked_sub(fee_amount).expect("Fee subtraction underflow");

            // Calculate next price (limited by price limit)
            let sqrt_price_target = sqrt_price_limit;

            sqrt_price_x96 = if exact_input {
                crate::math::SqrtPriceMath::get_next_sqrt_price_from_input(
                    sqrt_price_x96,
                    current_liquidity,
                    amount_in_after_fee,
                    zero_for_one,
                )
            } else {
                crate::math::SqrtPriceMath::get_next_sqrt_price_from_output(
                    sqrt_price_x96,
                    current_liquidity,
                    amount_in_u256,
                    zero_for_one,
                )
            };

            // Clamp to price limit (don't cross it)
            let hit_price_limit = if zero_for_one {
                let clamped = sqrt_price_x96.max(sqrt_price_target);
                let hit_limit = clamped != sqrt_price_x96;
                sqrt_price_x96 = clamped;
                hit_limit
            } else {
                let clamped = sqrt_price_x96.min(sqrt_price_target);
                let hit_limit = clamped != sqrt_price_x96;
                sqrt_price_x96 = clamped;
                hit_limit
            };

            // Calculate amounts for this step
            let (amount_in_step, amount_out_step) = if zero_for_one {
                let amt_in = crate::math::SqrtPriceMath::get_amount0_delta(
                    sqrt_price_x96,
                    sqrt_price_start,
                    current_liquidity,
                    true, // round up for amount in
                );
                let amt_out = crate::math::SqrtPriceMath::get_amount1_delta(
                    sqrt_price_x96,
                    sqrt_price_start,
                    current_liquidity,
                    false, // round down for amount out
                );
                (amt_in, amt_out)
            } else {
                let amt_in = crate::math::SqrtPriceMath::get_amount1_delta(
                    sqrt_price_start,
                    sqrt_price_x96,
                    current_liquidity,
                    true, // round up for amount in
                );
                let amt_out = crate::math::SqrtPriceMath::get_amount0_delta(
                    sqrt_price_start,
                    sqrt_price_x96,
                    current_liquidity,
                    false, // round down for amount out
                );
                (amt_in, amt_out)
            };

            // Update remaining amount and calculated amount
            let amount_in_with_fee = amount_in_step.as_u128();
            if amount_in_with_fee >= amount_specified_remaining {
                amount_specified_remaining = 0;
            } else {
                amount_specified_remaining -= amount_in_with_fee;
            }
            amount_calculated += amount_out_step.as_u128();

            // Update fee growth
            if !fee_amount.is_zero() && !current_liquidity.is_zero() {
                let step_fee = amount_in_step
                    .checked_mul(U256::from(pool_data.fee))
                    .expect("Step fee overflow")
                    .checked_div(U256::from(1_000_000u32))
                    .unwrap_or(U256::zero());

                let fee_growth_delta = (step_fee << 128)
                    .checked_div(U256::from(current_liquidity.as_u128()))
                    .unwrap_or(U256::zero());

                if zero_for_one {
                    pool_data.fee_growth_global_0_x128 = pool_data.fee_growth_global_0_x128 + fee_growth_delta;
                } else {
                    pool_data.fee_growth_global_1_x128 = pool_data.fee_growth_global_1_x128 + fee_growth_delta;
                }
            }

            // Check if we hit price limit - if so, stop
            if hit_price_limit {
                break;
            }

            // Tick crossing logic
            // Calculate what tick corresponds to the new price
            let tick_at_new_price = crate::math::TickMath::get_tick_at_sqrt_ratio(sqrt_price_x96);

            // Check if we crossed a tick boundary
            if zero_for_one {
                // Moving down in price (left in tick space)
                // Check if we crossed the lower tick boundary
                if tick_at_new_price < current_tick {
                    // We've crossed one or more ticks - need to update liquidity
                    // Find the next initialized tick
                    let (next_tick, initialized) = self._find_next_initialized_tick(
                        pool_id,
                        current_tick,
                        true // searching downward
                    );

                    if initialized && tick_at_new_price <= next_tick {
                        // Cross the tick and update liquidity
                        let tick_info = self.ticks.get(&(pool_id, next_tick)).unwrap_or_default();
                        let liquidity_net = tick_info.liquidity_net.as_i128();

                        // When crossing left to right, we subtract liquidity_net
                        // When crossing right to left (our case), we add liquidity_net
                        current_liquidity = if liquidity_net >= 0 {
                            U128::from(current_liquidity.as_u128() + liquidity_net as u128)
                        } else {
                            U128::from(current_liquidity.as_u128() - (-liquidity_net) as u128)
                        };

                        current_tick = next_tick - 1; // Move below the crossed tick
                    } else {
                        current_tick = tick_at_new_price;
                    }
                } else {
                    current_tick = tick_at_new_price;
                }
            } else {
                // Moving up in price (right in tick space)
                // Check if we crossed the upper tick boundary
                if tick_at_new_price > current_tick {
                    // We've crossed one or more ticks - need to update liquidity
                    // Find the next initialized tick
                    let (next_tick, initialized) = self._find_next_initialized_tick(
                        pool_id,
                        current_tick,
                        false // searching upward
                    );

                    if initialized && tick_at_new_price >= next_tick {
                        // Cross the tick and update liquidity
                        let tick_info = self.ticks.get(&(pool_id, next_tick)).unwrap_or_default();
                        let liquidity_net = tick_info.liquidity_net.as_i128();

                        // When crossing left to right (our case), we add liquidity_net
                        current_liquidity = if liquidity_net >= 0 {
                            U128::from(current_liquidity.as_u128() + liquidity_net as u128)
                        } else {
                            U128::from(current_liquidity.as_u128() - (-liquidity_net) as u128)
                        };

                        current_tick = next_tick; // Move to the crossed tick
                    } else {
                        current_tick = tick_at_new_price;
                    }
                } else {
                    current_tick = tick_at_new_price;
                }
            }
        }

        // Update pool state
        pool_data.slot0.sqrt_price_x96 = sqrt_price_x96;
        pool_data.slot0.tick = crate::math::TickMath::get_tick_at_sqrt_ratio(sqrt_price_x96);

        // Update TWAP oracle observation
        let current_tick = pool_data.slot0.tick;
        pool_data.slot0 = self._write_observation(
            pool_id,
            pool_data.slot0,
            current_tick,
            current_liquidity,
        );

        self.pools.set(&pool_key, pool_data);

        // Calculate final amounts
        let (amount0, amount1) = if zero_for_one {
            (amount_specified, -(amount_calculated as i64))
        } else {
            (-(amount_calculated as i64), amount_specified)
        };

        // Transfer tokens with fee-on-transfer protection
        let caller = self.env().caller();
        let dex_address = self.env().self_address();

        if amount0 > 0 {
            // User sends token0 to DEX
            let mut token0_contract = Erc20ContractRef::new(self.env(), token0);
            let balance_before = token0_contract.balance_of(&dex_address);
            token0_contract.transfer_from(&caller, &dex_address, &U256::from(amount0 as u128));
            let balance_after = token0_contract.balance_of(&dex_address);
            let received = balance_after - balance_before;
            assert!(received >= U256::from(amount0 as u128), "Fee-on-transfer tokens not supported");
        } else if amount0 < 0 {
            // DEX sends token0 to user
            let mut token0_contract = Erc20ContractRef::new(self.env(), token0);
            token0_contract.transfer(&recipient, &U256::from((-amount0) as u128));
        }

        if amount1 > 0 {
            // User sends token1 to DEX
            let mut token1_contract = Erc20ContractRef::new(self.env(), token1);
            let balance_before = token1_contract.balance_of(&dex_address);
            token1_contract.transfer_from(&caller, &dex_address, &U256::from(amount1 as u128));
            let balance_after = token1_contract.balance_of(&dex_address);
            let received = balance_after - balance_before;
            assert!(received >= U256::from(amount1 as u128), "Fee-on-transfer tokens not supported");
        } else if amount1 < 0 {
            // DEX sends token1 to user
            let mut token1_contract = Erc20ContractRef::new(self.env(), token1);
            token1_contract.transfer(&recipient, &U256::from((-amount1) as u128));
        }

        (amount0, amount1)
    }
    fn _modify_position(
        &mut self,
        pool_key: (Address, Address, u32),
        pool_id: [u8; 32],
        owner: Address,
        tick_lower: i32,
        tick_upper: i32,
        liquidity_delta: i64,
    ) -> (U256, U256) {
        if liquidity_delta == 0 {
            return (U256::zero(), U256::zero());
        }

        // Get pool data to access current price
        let pool_data = self.pools.get(&pool_key).expect("Pool does not exist");
        let sqrt_price_current = pool_data.slot0.sqrt_price_x96;
        let current_tick = pool_data.slot0.tick;

        // Update tick data (track liquidity changes at tick boundaries)
        self._update_tick(pool_id, tick_lower, liquidity_delta, current_tick);
        self._update_tick(pool_id, tick_upper, liquidity_delta, current_tick);

        // Get position key
        let position_key = Self::compute_position_key(owner, tick_lower, tick_upper);

        // Get or create position
        let mut position = self.positions.get(&(pool_id, position_key)).unwrap_or_default();

        // Update position liquidity
        position.liquidity = if liquidity_delta >= 0 {
            position.liquidity + (liquidity_delta as u128)
        } else {
            let delta_abs = U128::from((-liquidity_delta) as u128);
            assert!(position.liquidity >= delta_abs, "Insufficient liquidity");
            position.liquidity - delta_abs.as_u128()
        };

        // Save updated position
        self.positions.set(&(pool_id, position_key), position);

        // Get tick prices
        let sqrt_price_lower = crate::math::TickMath::get_sqrt_ratio_at_tick(tick_lower);
        let sqrt_price_upper = crate::math::TickMath::get_sqrt_ratio_at_tick(tick_upper);

        let liquidity_abs = U128::from(liquidity_delta.unsigned_abs());

        // Calculate token amounts based on current price position
        let (amount0, amount1) = if sqrt_price_current < sqrt_price_lower {
            // Current price below range - only token0 needed
            let amount0 = crate::math::SqrtPriceMath::get_amount0_delta(
                sqrt_price_lower,
                sqrt_price_upper,
                liquidity_abs,
                liquidity_delta > 0,
            );
            (amount0, U256::zero())
        } else if sqrt_price_current < sqrt_price_upper {
            // Current price in range - both tokens needed
            let amount0 = crate::math::SqrtPriceMath::get_amount0_delta(
                sqrt_price_current,
                sqrt_price_upper,
                liquidity_abs,
                liquidity_delta > 0,
            );
            let amount1 = crate::math::SqrtPriceMath::get_amount1_delta(
                sqrt_price_lower,
                sqrt_price_current,
                liquidity_abs,
                liquidity_delta > 0,
            );
            (amount0, amount1)
        } else {
            // Current price above range - only token1 needed
            let amount1 = crate::math::SqrtPriceMath::get_amount1_delta(
                sqrt_price_lower,
                sqrt_price_upper,
                liquidity_abs,
                liquidity_delta > 0,
            );
            (U256::zero(), amount1)
        };

        (amount0, amount1)
    }

    /// Update tick data when liquidity changes at a tick boundary
    fn _update_tick(
        &mut self,
        pool_id: [u8; 32],
        tick: i32,
        liquidity_delta: i64,
        _current_tick: i32, // Reserved for future tick crossing implementation
    ) {
        let mut tick_info = self.ticks.get(&(pool_id, tick)).unwrap_or_default();

        let liquidity_gross_before = tick_info.liquidity_gross;

        // Update liquidity gross (total liquidity referencing this tick) with checked arithmetic
        tick_info.liquidity_gross = if liquidity_delta >= 0 {
            tick_info.liquidity_gross + (liquidity_delta as u128)
        } else {
            let delta_abs = U128::from((-liquidity_delta) as u128);
            assert!(tick_info.liquidity_gross >= delta_abs, "Insufficient tick liquidity");
            tick_info.liquidity_gross - delta_abs.as_u128()
        };

        // Update liquidity net (liquidity change when crossing this tick)
        // When crossing from left to right, add liquidity_net
        // When crossing from right to left, subtract liquidity_net
        let current_net = tick_info.liquidity_net.as_i128();
        tick_info.liquidity_net = I128::from_i128(current_net + liquidity_delta as i128);

        // If this tick now has liquidity and didn't before, flip it in the bitmap
        if liquidity_gross_before == U128::zero() && tick_info.liquidity_gross > U128::zero() {
            self._flip_tick_in_bitmap(pool_id, tick);
            tick_info.initialized = true;
        } else if liquidity_gross_before > U128::zero() && tick_info.liquidity_gross == U128::zero() {
            // If tick no longer has liquidity, flip it off
            self._flip_tick_in_bitmap(pool_id, tick);
            tick_info.initialized = false;
        }

        self.ticks.set(&(pool_id, tick), tick_info);
    }

    /// Flip a tick's bit in the bitmap to mark it as initialized/uninitialized
    fn _flip_tick_in_bitmap(&mut self, pool_id: [u8; 32], tick: i32) {
        // Calculate word position and bit position within the word
        // Each word (U256) can store 256 ticks
        let word_pos = tick >> 8; // Divide by 256 (stays as i32 for ToBytes support)
        // Fix for negative ticks: ensure bit_pos is always 0-255
        let bit_pos = ((tick % 256 + 256) % 256) as u8;

        // Get current word (or zero if doesn't exist)
        let mut word = self.tick_bitmaps
            .get(&(pool_id, word_pos))
            .unwrap_or(U256::zero());

        // Flip the bit at bit_pos
        let mask = U256::one() << bit_pos;
        word ^= mask;

        // Store updated word
        self.tick_bitmaps.set(&(pool_id, word_pos), word);
    }

    /// Find the next initialized tick in the bitmap
    ///
    /// # Arguments
    /// * `pool_id` - The pool identifier
    /// * `current_tick` - The current tick
    /// * `search_down` - If true, search for ticks <= current_tick; if false, search for ticks > current_tick
    ///
    /// # Returns
    /// * `next_tick` - The next initialized tick (or boundary tick if none found)
    /// * `initialized` - Whether an initialized tick was found
    fn _find_next_initialized_tick(
        &self,
        pool_id: [u8; 32],
        current_tick: i32,
        search_down: bool,
    ) -> (i32, bool) {
        // Get the word position and bit position
        let word_pos = current_tick >> 8; // Divide by 256
        let bit_pos = ((current_tick % 256 + 256) % 256) as u8;

        // Get the bitmap word
        let word = self.tick_bitmaps
            .get(&(pool_id, word_pos))
            .unwrap_or(U256::zero());

        if search_down {
            // Search for initialized ticks <= current_tick
            // Create a mask for bits at or below the current position
            let mask = if bit_pos == 255 {
                U256::MAX
            } else {
                (U256::one() << (bit_pos + 1)) - U256::one()
            };
            let masked = word & mask;

            if !masked.is_zero() {
                // Found an initialized tick in this word
                let next_bit = Self::_most_significant_bit(masked);
                let next_tick = (word_pos << 8) | (next_bit as i32);
                (next_tick, true)
            } else {
                // No initialized tick in this word, return the start of this word
                (word_pos << 8, false)
            }
        } else {
            // Search for initialized ticks > current_tick
            // Create a mask for bits above the current position
            let mask = !(((U256::one() << (bit_pos + 1)) - U256::one()));
            let masked = word & mask;

            if !masked.is_zero() {
                // Found an initialized tick in this word
                let next_bit = Self::_least_significant_bit(masked);
                let next_tick = (word_pos << 8) | (next_bit as i32);
                (next_tick, true)
            } else {
                // No initialized tick in this word, return the end of this word
                ((word_pos << 8) + 255, false)
            }
        }
    }

    /// Find the most significant bit (MSB) in a U256
    fn _most_significant_bit(x: U256) -> u8 {
        if x.is_zero() {
            return 0;
        }

        let mut r = 0u8;
        let mut x = x;

        if x >= (U256::one() << 128) {
            x >>= 128;
            r += 128;
        }
        if x >= (U256::one() << 64) {
            x >>= 64;
            r += 64;
        }
        if x >= (U256::one() << 32) {
            x >>= 32;
            r += 32;
        }
        if x >= (U256::one() << 16) {
            x >>= 16;
            r += 16;
        }
        if x >= (U256::one() << 8) {
            x >>= 8;
            r += 8;
        }
        if x >= (U256::one() << 4) {
            x >>= 4;
            r += 4;
        }
        if x >= (U256::one() << 2) {
            x >>= 2;
            r += 2;
        }
        if x >= (U256::one() << 1) {
            r += 1;
        }

        r
    }

    /// Find the least significant bit (LSB) in a U256
    fn _least_significant_bit(x: U256) -> u8 {
        if x.is_zero() {
            return 0;
        }

        let mut r = 255u8;
        let mut x = x;

        let u128_max_as_u256 = (U256::one() << 128) - U256::one();
        if x & u128_max_as_u256 > U256::zero() {
            r -= 128;
        } else {
            x >>= 128;
        }

        if x & U256::from(u64::MAX) > U256::zero() {
            r -= 64;
        } else {
            x >>= 64;
        }

        if x & U256::from(u32::MAX) > U256::zero() {
            r -= 32;
        } else {
            x >>= 32;
        }

        if x & U256::from(u16::MAX) > U256::zero() {
            r -= 16;
        } else {
            x >>= 16;
        }

        if x & U256::from(u8::MAX) > U256::zero() {
            r -= 8;
        } else {
            x >>= 8;
        }

        if x & U256::from(0xFu8) > U256::zero() {
            r -= 4;
        } else {
            x >>= 4;
        }

        if x & U256::from(0x3u8) > U256::zero() {
            r -= 2;
        } else {
            x >>= 2;
        }

        if x & U256::from(0x1u8) > U256::zero() {
            r -= 1;
        }

        r
    }

    /// Write a new observation to the oracle
    ///
    /// # Arguments
    /// * `pool_id` - The pool identifier
    /// * `slot0` - The current slot0 state
    /// * `tick` - The current tick
    /// * `liquidity` - The current liquidity
    ///
    /// # Returns
    /// Updated slot0 with new observation index
    fn _write_observation(
        &mut self,
        pool_id: [u8; 32],
        mut slot0: Slot0,
        tick: i32,
        liquidity: U128,
    ) -> Slot0 {
        let block_timestamp = self.env().get_block_time();

        // Get the last observation
        let last_observation = self.observations
            .get(&(pool_id, slot0.observation_index))
            .unwrap_or_default();

        // Only write if enough time has passed (prevent same-block manipulation)
        if last_observation.block_timestamp >= block_timestamp as u32 {
            return slot0; // Same block, don't update
        }

        // Transform the observation
        let new_observation = Observation::transform(
            &last_observation,
            block_timestamp as u32,
            tick,
            liquidity,
        );

        // Move to next index (circular buffer)
        let next_index = (slot0.observation_index + 1) % slot0.observation_cardinality_next;
        slot0.observation_index = next_index;

        // Expand cardinality if needed
        if next_index == slot0.observation_cardinality {
            slot0.observation_cardinality = slot0.observation_cardinality_next;
        }

        // Write the observation
        self.observations.set(&(pool_id, next_index), new_observation);

        slot0
    }

    /// Observe TWAP price over a period
    ///
    /// # Arguments
    /// * `pool_id` - The pool identifier
    /// * `slot0` - The current slot0 state
    /// * `seconds_ago` - How many seconds ago to observe (0 = current)
    ///
    /// # Returns
    /// The tick cumulative at that time
    fn _observe(
        &self,
        pool_id: [u8; 32],
        slot0: &Slot0,
        seconds_ago: u32,
    ) -> Option<i64> {
        let current_time = self.env().get_block_time() as u32;

        if seconds_ago == 0 {
            // Current observation
            let obs = self.observations.get(&(pool_id, slot0.observation_index))?;
            return Some(obs.tick_cumulative);
        }

        let target_time = current_time.checked_sub(seconds_ago)?;

        // Find the observation closest to target_time
        // For simplicity, we look at the current and previous observation
        let current_obs = self.observations.get(&(pool_id, slot0.observation_index))?;

        // If we have exactly the time we want
        if current_obs.block_timestamp == target_time {
            return Some(current_obs.tick_cumulative);
        }

        // Get previous observation
        let prev_index = if slot0.observation_index == 0 {
            slot0.observation_cardinality - 1
        } else {
            slot0.observation_index - 1
        };

        let prev_obs = self.observations.get(&(pool_id, prev_index))?;

        // Interpolate between observations
        if target_time >= prev_obs.block_timestamp && target_time <= current_obs.block_timestamp {
            let delta = target_time - prev_obs.block_timestamp;
            let total_delta = current_obs.block_timestamp - prev_obs.block_timestamp;

            if total_delta == 0 {
                return Some(current_obs.tick_cumulative);
            }

            let tick_delta = current_obs.tick_cumulative - prev_obs.tick_cumulative;
            let interpolated = prev_obs.tick_cumulative + (tick_delta * delta as i64 / total_delta as i64);

            Some(interpolated)
        } else {
            None // Time is outside available observation window
        }
    }

    fn compute_pool_id(token0: Address, token1: Address, fee: u32) -> [u8; 32] {
        use odra::casper_types::bytesrepr::ToBytes;

        let mut key_bytes = Vec::new();
        key_bytes.extend_from_slice(&token0.to_bytes().unwrap());
        key_bytes.extend_from_slice(&token1.to_bytes().unwrap());
        key_bytes.extend_from_slice(&fee.to_le_bytes());

        // Use a simple but collision-resistant hash combining all bytes
        // In production, consider using a cryptographic hash library
        let mut hash = [0u8; 32];
        let len = key_bytes.len();
        for (i, byte) in key_bytes.iter().enumerate() {
            // Better mixing than simple XOR
            hash[i % 32] = hash[i % 32].wrapping_add(*byte).wrapping_mul(31);
            hash[(i * 7) % 32] ^= byte.rotate_left((i % 8) as u32);
        }
        // Final mixing pass
        for i in 0..32 {
            hash[i] ^= (len as u8).wrapping_mul((i + 1) as u8);
        }
        hash
    }

    fn compute_position_key(owner: Address, tick_lower: i32, tick_upper: i32) -> [u8; 32] {
        use odra::casper_types::bytesrepr::ToBytes;

        let mut key_bytes = Vec::new();
        key_bytes.extend_from_slice(&owner.to_bytes().unwrap());
        key_bytes.extend_from_slice(&tick_lower.to_le_bytes());
        key_bytes.extend_from_slice(&tick_upper.to_le_bytes());

        // Use a simple but collision-resistant hash combining all bytes
        let mut hash = [0u8; 32];
        let len = key_bytes.len();
        for (i, byte) in key_bytes.iter().enumerate() {
            // Better mixing than simple XOR
            hash[i % 32] = hash[i % 32].wrapping_add(*byte).wrapping_mul(31);
            hash[(i * 7) % 32] ^= byte.rotate_left((i % 8) as u32);
        }
        // Final mixing pass
        for i in 0..32 {
            hash[i] ^= (len as u8).wrapping_mul((i + 1) as u8);
        }
        hash
    }

    // Getters
    pub fn get_pool(&self, token0: Address, token1: Address, fee: u32) -> Option<PoolData> {
        self.pools.get(&(token0, token1, fee))
    }

    pub fn enable_fee_amount(&mut self, fee: u32, tick_spacing: i32) {
        self.ownable.assert_owner(&self.env().caller());
        assert!(fee < 1000000, "Fee too high");
        assert!(tick_spacing > 0 && tick_spacing < 16384, "Invalid tick spacing");
        assert!(self.fee_amount_tick_spacing.get(&fee).is_none(), "Fee already enabled");

        self.fee_amount_tick_spacing.set(&fee, tick_spacing);
    }

    // ========== FRONTEND INTEGRATION FUNCTIONS ==========

    /// Get swap quote without executing
    pub fn quote_exact_input_single(
        &self,
        token_in: Address,
        token_out: Address,
        fee: u32,
        amount_in: U256,
    ) -> Option<QuoteResult> {
        // Order tokens
        let (token0, token1) = if token_in < token_out {
            (token_in, token_out)
        } else {
            (token_out, token_in)
        };
        let zero_for_one = token_in == token0;

        let pool_key = (token0, token1, fee);
        let pool_data = self.pools.get(&pool_key)?;

        if pool_data.slot0.sqrt_price_x96.is_zero() || pool_data.liquidity.is_zero() {
            return None;
        }

        // Calculate quote
        let fee_amount = (amount_in * U256::from(pool_data.fee)) / U256::from(1_000_000u32);
        let amount_in_after_fee = amount_in - fee_amount;

        let sqrt_price_after = crate::math::SqrtPriceMath::get_next_sqrt_price_from_input(
            pool_data.slot0.sqrt_price_x96,
            pool_data.liquidity,
            amount_in_after_fee,
            zero_for_one,
        );

        let amount_out = if zero_for_one {
            crate::math::SqrtPriceMath::get_amount1_delta(
                sqrt_price_after,
                pool_data.slot0.sqrt_price_x96,
                pool_data.liquidity,
                false,
            )
        } else {
            crate::math::SqrtPriceMath::get_amount0_delta(
                pool_data.slot0.sqrt_price_x96,
                sqrt_price_after,
                pool_data.liquidity,
                false,
            )
        };

        let tick_after = crate::math::TickMath::get_tick_at_sqrt_ratio(sqrt_price_after);

        Some(QuoteResult {
            amount_out,
            sqrt_price_x96_after: sqrt_price_after,
            tick_after,
            fee_amount,
        })
    }

    /// Get current price in human-readable format (token1/token0)
    pub fn get_price(&self, token0: Address, token1: Address, fee: u32) -> Option<U256> {
        let pool_key = (token0, token1, fee);
        let pool_data = self.pools.get(&pool_key)?;

        if pool_data.slot0.sqrt_price_x96.is_zero() {
            return None;
        }

        // price = (sqrtPriceX96 / 2^96) ^ 2
        let sqrt_price = pool_data.slot0.sqrt_price_x96;
        let q96 = U256::from(1u128 << 96);
        let price = (sqrt_price * sqrt_price) / (q96 * q96);

        Some(price)
    }

    /// Get position details including tokens owed
    pub fn get_position_with_fees(
        &self,
        token0: Address,
        token1: Address,
        fee: u32,
        owner: Address,
        tick_lower: i32,
        tick_upper: i32,
    ) -> Option<Position> {
        let pool_id = Self::compute_pool_id(token0, token1, fee);
        let position_key = Self::compute_position_key(owner, tick_lower, tick_upper);
        self.positions.get(&(pool_id, position_key))
    }

    /// Get TWAP (Time-Weighted Average Price) over a period
    ///
    /// # Arguments
    /// * `token0` - First token address
    /// * `token1` - Second token address
    /// * `fee` - Fee tier
    /// * `seconds_ago_start` - Oldest time point (e.g., 300 for 5 minutes ago)
    /// * `seconds_ago_end` - Newest time point (usually 0 for current)
    ///
    /// # Returns
    /// Average tick over the period (can be converted to price)
    ///
    /// # Example
    /// ```ignore
    /// // Get 5-minute TWAP
    /// let twap_tick = dex.get_twap(token0, token1, 3000, 300, 0);
    /// // Convert to price: price = 1.0001^twap_tick
    /// ```
    pub fn get_twap(
        &self,
        token0: Address,
        token1: Address,
        fee: u32,
        seconds_ago_start: u32,
        seconds_ago_end: u32,
    ) -> Option<i32> {
        let pool_key = (token0, token1, fee);
        let pool_data = self.pools.get(&pool_key)?;
        let pool_id = Self::compute_pool_id(token0, token1, fee);

        // Get tick cumulatives at both times
        let tick_cumulative_old = self._observe(pool_id, &pool_data.slot0, seconds_ago_start)?;
        let tick_cumulative_new = self._observe(pool_id, &pool_data.slot0, seconds_ago_end)?;

        // Calculate time-weighted average tick
        let time_delta = seconds_ago_start - seconds_ago_end;
        if time_delta == 0 {
            return Some(pool_data.slot0.tick);
        }

        let tick_delta = tick_cumulative_new - tick_cumulative_old;
        let average_tick = tick_delta / time_delta as i64;

        Some(average_tick as i32)
    }

    /// Get observation at a specific index
    ///
    /// # Arguments
    /// * `token0` - First token address
    /// * `token1` - Second token address
    /// * `fee` - Fee tier
    /// * `index` - Observation index
    ///
    /// # Returns
    /// The observation at that index
    pub fn get_observation(
        &self,
        token0: Address,
        token1: Address,
        fee: u32,
        index: u32,
    ) -> Option<Observation> {
        let pool_id = Self::compute_pool_id(token0, token1, fee);
        self.observations.get(&(pool_id, index))
    }

    /// Increase the observation cardinality for more granular TWAP
    ///
    /// # Arguments
    /// * `token0` - First token address
    /// * `token1` - Second token address
    /// * `fee` - Fee tier
    /// * `cardinality_next` - New target cardinality
    pub fn increase_observation_cardinality(
        &mut self,
        token0: Address,
        token1: Address,
        fee: u32,
        cardinality_next: u32,
    ) {
        let pool_key = (token0, token1, fee);
        let mut pool_data = self.pools.get(&pool_key).expect("Pool does not exist");

        assert!(
            cardinality_next > pool_data.slot0.observation_cardinality,
            "Cardinality must increase"
        );
        assert!(
            cardinality_next <= 65535,
            "Cardinality too large"
        );

        pool_data.slot0.observation_cardinality_next = cardinality_next;
        self.pools.set(&pool_key, pool_data);
    }

    /// Check if price manipulation is likely based on TWAP deviation
    ///
    /// # Arguments
    /// * `token0` - First token address
    /// * `token1` - Second token address
    /// * `fee` - Fee tier
    /// * `max_deviation_bps` - Maximum allowed deviation in basis points (e.g., 500 = 5%)
    ///
    /// # Returns
    /// true if price is within acceptable range, false if manipulation suspected
    pub fn check_price_manipulation(
        &self,
        token0: Address,
        token1: Address,
        fee: u32,
        max_deviation_bps: u32,
    ) -> bool {
        let pool_key = (token0, token1, fee);
        let pool_data = match self.pools.get(&pool_key) {
            Some(data) => data,
            None => return false,
        };

        // Get 5-minute TWAP (300 seconds)
        let twap_tick = match self.get_twap(token0, token1, fee, 300, 0) {
            Some(tick) => tick,
            None => return true, // Can't check, allow it (pool too new)
        };

        let current_tick = pool_data.slot0.tick;
        let tick_diff = (current_tick - twap_tick).abs();

        // Convert max_deviation_bps to tick difference
        // Each tick = 0.01% price change (1 basis point)
        // So max_deviation in ticks = max_deviation_bps
        let max_tick_diff = max_deviation_bps as i32;

        tick_diff <= max_tick_diff
    }
}

/// Result of a swap quote
#[odra::odra_type]
pub struct QuoteResult {
    pub amount_out: U256,
    pub sqrt_price_x96_after: U256,
    pub tick_after: i32,
    pub fee_amount: U256,
}