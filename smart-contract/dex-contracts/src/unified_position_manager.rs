use odra::{
    casper_types::{U256, U128},
    prelude::*,
    ContractRef,
};
use crate::unified_dex::UnifiedDexContractRef;

/// Simplified position manager for the unified DEX
#[odra::module]
pub struct UnifiedPositionManager {
    dex_address: Var<Address>,
    next_token_id: Var<u64>,
    positions: Mapping<u64, PositionInfo>,
    owners: Mapping<u64, Address>,
}

#[odra::odra_type]
pub struct PositionInfo {
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: U128,
}

#[odra::odra_type]
pub struct MintParams {
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount0_desired: U256,
    pub amount1_desired: U256,
    pub amount0_min: U256,
    pub amount1_min: U256,
    pub recipient: Address,
    pub deadline: u64,
}

#[odra::module]
impl UnifiedPositionManager {
    #[odra(init)]
    pub fn init(&mut self, dex_address: Address) {
        self.dex_address.set(dex_address);
        self.next_token_id.set(1);
    }

    /// Mint a new position NFT
    pub fn mint(&mut self, params: MintParams) -> u64 {
        assert!(self.env().get_block_time() <= params.deadline, "Transaction too old");

        let dex_address = self.dex_address.get().unwrap();
        let mut dex = UnifiedDexContractRef::new(self.env(), dex_address);

        // Get pool to determine current price
        let pool_data = dex.get_pool(params.token0, params.token1, params.fee)
            .expect("Pool does not exist");

        // Calculate tick prices
        let sqrt_price_lower = self.get_sqrt_ratio_at_tick(params.tick_lower);
        let sqrt_price_upper = self.get_sqrt_ratio_at_tick(params.tick_upper);
        let sqrt_price_current = pool_data.slot0.sqrt_price_x96;

        // Calculate liquidity from desired amounts
        let liquidity = self.get_liquidity_for_amounts(
            sqrt_price_current,
            sqrt_price_lower,
            sqrt_price_upper,
            params.amount0_desired,
            params.amount1_desired,
        );

        // Mint liquidity in DEX (slippage protection handled by DEX)
        let (_amount0, _amount1) = dex.mint(
            params.token0,
            params.token1,
            params.fee,
            params.recipient,
            params.tick_lower,
            params.tick_upper,
            liquidity,
            params.amount0_min, // Slippage protection
            params.amount1_min,
        );

        // No need to verify here - DEX already checked slippage
        // amounts are returned but not needed since we track liquidity in NFT position

        let token_id = self.next_token_id.get().unwrap();
        self.next_token_id.set(token_id + 1);

        let position = PositionInfo {
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tick_lower: params.tick_lower,
            tick_upper: params.tick_upper,
            liquidity,
        };

        self.positions.set(&token_id, position);
        self.owners.set(&token_id, params.recipient);

        token_id
    }

    /// Helper: Get sqrt ratio at tick (copied from TickMath for convenience)
    fn get_sqrt_ratio_at_tick(&self, tick: i32) -> U256 {
        use crate::math::TickMath;
        TickMath::get_sqrt_ratio_at_tick(tick)
    }

    /// Helper: Calculate liquidity for given amounts
    fn get_liquidity_for_amounts(
        &self,
        sqrt_ratio_x96: U256,
        sqrt_ratio_a_x96: U256,
        sqrt_ratio_b_x96: U256,
        amount0: U256,
        amount1: U256,
    ) -> U128 {
        use crate::math::LiquidityMath;
        LiquidityMath::get_liquidity_for_amounts(
            sqrt_ratio_x96,
            sqrt_ratio_a_x96,
            sqrt_ratio_b_x96,
            amount0,
            amount1,
        )
    }

    /// Decrease liquidity from a position
    pub fn decrease_liquidity(
        &mut self,
        token_id: u64,
        liquidity: U128,
        amount0_min: U256,
        amount1_min: U256,
        deadline: u64,
    ) -> (U256, U256) {
        assert!(self.env().get_block_time() <= deadline, "Transaction too old");
        
        let caller = self.env().caller();
        let owner = self.owners.get(&token_id).expect("Invalid token ID");
        assert!(caller == owner, "Not authorized");

        let position = self.positions.get(&token_id).expect("Position not found");
        
        let dex_address = self.dex_address.get().unwrap();
        let mut dex = UnifiedDexContractRef::new(self.env(), dex_address);

        let (amount0, amount1) = dex.burn(
            position.token0,
            position.token1,
            position.fee,
            position.tick_lower,
            position.tick_upper,
            liquidity,
        );

        assert!(amount0 >= amount0_min, "Amount0 too low");
        assert!(amount1 >= amount1_min, "Amount1 too low");

        // Update position
        let mut updated_position = position;
        updated_position.liquidity = updated_position.liquidity - liquidity;
        self.positions.set(&token_id, updated_position);

        (amount0, amount1)
    }

    /// Collect fees and tokens owed
    pub fn collect(
        &mut self,
        token_id: u64,
        recipient: Address,
        amount0_max: U128,
        amount1_max: U128,
    ) -> (U128, U128) {
        let caller = self.env().caller();
        let owner = self.owners.get(&token_id).expect("Invalid token ID");
        assert!(caller == owner, "Not authorized");

        let position = self.positions.get(&token_id).expect("Position not found");
        
        let dex_address = self.dex_address.get().unwrap();
        let mut dex = UnifiedDexContractRef::new(self.env(), dex_address);

        dex.collect(
            position.token0,
            position.token1,
            position.fee,
            recipient,
            position.tick_lower,
            position.tick_upper,
            amount0_max,
            amount1_max,
        )
    }

    // Getters
    pub fn get_position(&self, token_id: u64) -> Option<PositionInfo> {
        self.positions.get(&token_id)
    }

    pub fn owner_of(&self, token_id: u64) -> Option<Address> {
        self.owners.get(&token_id)
    }
}