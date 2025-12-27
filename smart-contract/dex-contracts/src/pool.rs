use odra::{
    casper_types::{U256, U128},
    prelude::*,
    ContractRef,
};
use odra_modules::erc20::Erc20ContractRef;
use crate::{
    constants::*, math::{LiquidityMath, SqrtPriceMath, TickMath}, storage::TickBitmap, types::{events::{Burn, Collect, Initialize, Mint}, pool_info::{Observation, PoolInfo, Slot0}, position::Position, tick::Tick}
};

#[odra::external_contract]
pub trait IPool {
    fn mint(&mut self, recipient: Address, tick_lower: i32, tick_upper: i32, amount: U128) -> (U256, U256);
    fn burn(&mut self, tick_lower: i32, tick_upper: i32, amount: U128) -> (U256, U256);
    fn collect(&mut self, recipient: Address, tick_lower: i32, tick_upper: i32, amount0_requested: U128, amount1_requested: U128) -> (U128, U128);
}

/// The main pool contract implementing concentrated liquidity AMM
#[odra::module]
pub struct Pool {
    // Immutable pool configuration, stored in a single struct to save space
    info: Var<PoolInfo>,

    // Hot state, stored in a single struct to save space
    slot0: Var<Slot0>,

    // Liquidity tracking
    liquidity: Var<U128>,

    // Fee tracking
    fee_growth_global_0_x128: Var<U256>,
    fee_growth_global_1_x128: Var<U256>,
    protocol_fees_token0: Var<U128>,
    protocol_fees_token1: Var<U128>,

    // Storage
    ticks: Mapping<i32, Tick>,
    positions: Mapping<[u8; 32], Position>,
    tick_bitmap: SubModule<TickBitmap>,
    observations: Mapping<u32, Observation>,
}

#[odra::module]
impl Pool {
    /// Initialize the pool contract
    pub fn init(&mut self, factory: Address, token0: Address, token1: Address, fee: u32, tick_spacing: i32) {
        // Calculate max liquidity per tick
        let tick_spacing_u128 = U128::from(tick_spacing.unsigned_abs());
        let max_liquidity = U128::MAX / tick_spacing_u128;

        let pool_info = PoolInfo {
            factory,
            token0,
            token1,
            fee,
            tick_spacing,
            max_liquidity_per_tick: max_liquidity,
        };
        self.info.set(pool_info);

        let slot0 = Slot0 {
            unlocked: true,
            ..Default::default()
        };
        self.slot0.set(slot0);
    }

    /// Initialize the pool with a starting price
    /// Can only be called once
    pub fn initialize(&mut self, sqrt_price_x96: U256) {
        let mut slot0 = self.slot0.get_or_default();
        assert!(slot0.sqrt_price_x96.is_zero(), "Already initialized");

        let tick = TickMath::get_tick_at_sqrt_ratio(sqrt_price_x96);

        slot0.sqrt_price_x96 = sqrt_price_x96;
        slot0.tick = tick;
        slot0.observation_cardinality = 1;
        slot0.observation_cardinality_next = 1;
        self.slot0.set(slot0);

        // Initialize first observation
        let observation = Observation {
            block_timestamp: self.env().get_block_time() as u32,
            tick_cumulative: 0,
            seconds_per_liquidity_cumulative_x128: U256::zero(),
            initialized: true,
        };
        self.observations.set(&0, observation);

        self.env().emit_event(Initialize {
            sqrt_price_x96,
            tick,
        });
    }

    /// Adds liquidity to a position
    ///
    /// # Arguments
    /// * `recipient` - The address that will own the position
    /// * `tick_lower` - The lower tick of the position
    /// * `tick_upper` - The upper tick of the position
    /// * `amount` - The amount of liquidity to add
    ///
    /// # Returns
    /// The amounts of token0 and token1 that were deposited
    pub fn mint(
        &mut self,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount: U128,
    ) -> (U256, U256) {
        assert!(!amount.is_zero(), "Amount cannot be zero");
        assert!(tick_lower < tick_upper, "Invalid tick range");
        assert!(tick_lower >= MIN_TICK && tick_upper <= MAX_TICK, "Tick out of bounds");

        let tick_spacing = self.info.get().unwrap().tick_spacing;
        assert!(tick_lower % tick_spacing == 0 && tick_upper % tick_spacing == 0, "Ticks not aligned to spacing");

        // Calculate amounts
        let (amount0, amount1) = self._modify_position(
            recipient,
            tick_lower,
            tick_upper,
            amount.as_u128() as i128,
        );

        // Transfer tokens from sender to pool
        let pool_info = self.info.get().unwrap();
        let sender = self.env().caller();
        let pool_address = self.env().self_address();

        if !amount0.is_zero() {
            let mut token0 = Erc20ContractRef::new(self.env(), pool_info.token0);
            token0.transfer_from(&sender, &pool_address, &amount0);
        }

        if !amount1.is_zero() {
            let mut token1 = Erc20ContractRef::new(self.env(), pool_info.token1);
            token1.transfer_from(&sender, &pool_address, &amount1);
        }

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

    /// Removes liquidity from a position
    ///
    /// # Arguments
    /// * `tick_lower` - The lower tick of the position
    /// * `tick_upper` - The upper tick of the position
    /// * `amount` - The amount of liquidity to remove
    ///
    /// # Returns
    /// The amounts of token0 and token1 that were withdrawn
    pub fn burn(
        &mut self,
        tick_lower: i32,
        tick_upper: i32,
        amount: U128,
    ) -> (U256, U256) {
        let caller = self.env().caller();

        let (amount0, amount1) = self._modify_position(
            caller,
            tick_lower,
            tick_upper,
            -(amount.as_u128() as i128),
        );

        // Update tokens owed
        let position_key = Self::compute_position_key(caller, tick_lower, tick_upper);
        let mut position = self.positions.get(&position_key).unwrap_or_default();
        position.tokens_owed_0 = position.tokens_owed_0 + amount0.as_u128();
        position.tokens_owed_1 = position.tokens_owed_1 + amount1.as_u128();
        self.positions.set(&position_key, position);

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

    /// Collects tokens owed to a position
    pub fn collect(
        &mut self,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount0_requested: U128,
        amount1_requested: U128,
    ) -> (U128, U128) {
        let caller = self.env().caller();
        let position_key = Self::compute_position_key(caller, tick_lower, tick_upper);
        let mut position = self.positions.get(&position_key).unwrap_or_default();

        let amount0 = amount0_requested.min(position.tokens_owed_0);
        let amount1 = amount1_requested.min(position.tokens_owed_1);

        position.tokens_owed_0 = position.tokens_owed_0 - amount0;
        position.tokens_owed_1 = position.tokens_owed_1 - amount1;
        self.positions.set(&position_key, position);

        // Transfer tokens to recipient
        let pool_info = self.info.get().unwrap();

        if !amount0.is_zero() {
            let mut token0 = Erc20ContractRef::new(self.env(), pool_info.token0);
            // Convert U128 to U256 safely
            let amount0_u256 = U256::from(amount0.as_u128());
            token0.transfer(&recipient, &amount0_u256);
        }

        if !amount1.is_zero() {
            let mut token1 = Erc20ContractRef::new(self.env(), pool_info.token1);
            // Convert U128 to U256 safely
            let amount1_u256 = U256::from(amount1.as_u128());
            token1.transfer(&recipient, &amount1_u256);
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

    /// Internal function to modify a position
    fn _modify_position(
        &mut self,
        owner: Address,
        tick_lower: i32,
        tick_upper: i32,
        liquidity_delta: i128,
    ) -> (U256, U256) {
        // Get current state
        let slot0 = self.slot0.get().unwrap();
        let tick = slot0.tick;

        // Update ticks
        let max_liquidity = self.info.get().unwrap().max_liquidity_per_tick;

        // Update lower tick
        self._update_tick(tick_lower, tick, liquidity_delta, false, max_liquidity);

        // Update upper tick
        self._update_tick(tick_upper, tick, liquidity_delta, true, max_liquidity);

        // Update position
        let position_key = Self::compute_position_key(owner, tick_lower, tick_upper);
        let mut position = self.positions.get(&position_key).unwrap_or_default();

        let fee_growth_inside_0 = self._get_fee_growth_inside(tick_lower, tick_upper, tick);
        let fee_growth_inside_1 = self._get_fee_growth_inside(tick_lower, tick_upper, tick);

        position.update(liquidity_delta, fee_growth_inside_0, fee_growth_inside_1);
        self.positions.set(&position_key, position);

        // Update global liquidity if position is in range
        if tick >= tick_lower && tick < tick_upper {
            let current_liquidity = self.liquidity.get_or_default();
            let new_liquidity = LiquidityMath::add_delta(current_liquidity, liquidity_delta);
            self.liquidity.set(new_liquidity);
        }

        // Calculate amounts
        let amount0 = SqrtPriceMath::get_amount0_delta(
            TickMath::get_sqrt_ratio_at_tick(tick_lower),
            TickMath::get_sqrt_ratio_at_tick(tick_upper),
            liquidity_delta.unsigned_abs().into(),
            liquidity_delta >= 0,
        );

        let amount1 = SqrtPriceMath::get_amount1_delta(
            TickMath::get_sqrt_ratio_at_tick(tick_lower),
            TickMath::get_sqrt_ratio_at_tick(tick_upper),
            liquidity_delta.unsigned_abs().into(),
            liquidity_delta >= 0,
        );

        (amount0, amount1)
    }

    /// Update a tick
    fn _update_tick(
        &mut self,
        tick: i32,
        tick_current: i32,
        liquidity_delta: i128,
        upper: bool,
        max_liquidity: U128,
    ) {
        let mut tick_info = self.ticks.get(&tick).unwrap_or_default();

        let fee_growth_global_0 = self.fee_growth_global_0_x128.get_or_default();
        let fee_growth_global_1 = self.fee_growth_global_1_x128.get_or_default();

        let flipped = tick_info.update(
            tick,
            tick_current,
            liquidity_delta,
            fee_growth_global_0,
            fee_growth_global_1,
            U256::zero(), // seconds_per_liquidity
            0,            // tick_cumulative
            self.env().get_block_time() as u32,
            upper,
            max_liquidity,
        );

        if flipped {
            self.tick_bitmap.flip_tick(tick, self.info.get().unwrap().tick_spacing);
        }

        self.ticks.set(&tick, tick_info);
    }

    /// Get fee growth inside a range
    fn _get_fee_growth_inside(&self, _tick_lower: i32, _tick_upper: i32, _tick_current: i32) -> U256 {
        // Simplified - just return global for now
        self.fee_growth_global_0_x128.get_or_default()
    }

    /// Compute position key hash
    fn compute_position_key(owner: Address, tick_lower: i32, tick_upper: i32) -> [u8; 32] {
        use odra::casper_types::bytesrepr::ToBytes;

        let mut key_bytes = Vec::new();
        key_bytes.extend_from_slice(&owner.to_bytes().unwrap());
        key_bytes.extend_from_slice(&tick_lower.to_le_bytes());
        key_bytes.extend_from_slice(&tick_upper.to_le_bytes());

        // Simple hash - in production use a proper hash function
        let mut hash = [0u8; 32];
        for (i, byte) in key_bytes.iter().enumerate() {
            hash[i % 32] ^= byte;
        }
        hash
    }

    // Getters
    pub fn get_sqrt_price_x96(&self) -> U256 {
        self.slot0.get_or_default().sqrt_price_x96
    }

    pub fn get_tick(&self) -> i32 {
        self.slot0.get_or_default().tick
    }

    pub fn get_liquidity(&self) -> U128 {
        self.liquidity.get_or_default()
    }

    pub fn get_token0(&self) -> Address {
        self.info.get().unwrap().token0
    }

    pub fn get_token1(&self) -> Address {
        self.info.get().unwrap().token1
    }

    pub fn get_fee(&self) -> u32 {
        self.info.get().unwrap().fee
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    #[test]
    fn test_pool_initialization() {
        let env = odra_test::env();
        let factory = env.get_account(0);
        let token0 = env.get_account(1);
        let token1 = env.get_account(2);
        let fee = 3000;
        let tick_spacing = 60;

        let init_args = PoolInitArgs { factory, token0, token1, fee, tick_spacing };
        let mut pool = Pool::deploy(&env, init_args);

        // Initialize with price = 1 (sqrt_price = 2^96)
        let sqrt_price = U256::from(Q96);
        pool.initialize(sqrt_price);

        assert_eq!(pool.get_sqrt_price_x96(), sqrt_price);
        assert_eq!(pool.get_tick(), 0);
    }
}
