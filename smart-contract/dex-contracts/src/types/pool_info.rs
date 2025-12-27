use odra::{
    casper_types::{U256, U128, bytesrepr::{ToBytes, FromBytes}},
    prelude::*,
};
use crate::types::tick::I128;
/// The state of the pool
#[odra::odra_type]
#[derive(Default)]
pub struct Slot0 {
    /// The current price (sqrt(token1/token0) as a Q64.96)
    pub sqrt_price_x96: U256,
    /// The current tick
    pub tick: i32,
    /// The current observation index
    pub observation_index: u32,
    /// The current observation cardinality
    pub observation_cardinality: u32,
    /// The next observation cardinality to use
    pub observation_cardinality_next: u32,
    /// The current protocol fee as a percentage of the swap fee (0-100)
    pub fee_protocol: u8,
    /// Whether the pool is currently locked
    pub unlocked: bool,
}

/// Pool configuration and state
#[odra::odra_type]
pub struct PoolInfo {
    /// Address of the factory that created this pool
    pub factory: Address,
    /// Address of token0
    pub token0: Address,
    /// Address of token1
    pub token1: Address,
    /// The pool's fee in hundredths of a bip (i.e. 1e-6)
    pub fee: u32,
    /// The pool tick spacing
    pub tick_spacing: i32,
    /// The maximum amount of liquidity per tick
    pub max_liquidity_per_tick: U128,
}

/// Oracle observation for TWAP
#[odra::odra_type]
#[derive(Default)]
pub struct Observation {
    /// The block timestamp of the observation
    pub block_timestamp: u32,
    /// The tick accumulator, i.e. tick * time elapsed since the pool was first initialized
    pub tick_cumulative: i64,
    /// The seconds per liquidity, i.e. seconds elapsed / max(1, liquidity) since the pool was first initialized
    pub seconds_per_liquidity_cumulative_x128: U256,
    /// Whether or not the observation is initialized
    pub initialized: bool,
}

impl Observation {
    /// Transforms a previous observation into a new observation, given the passage of time and the current tick and liquidity values
    ///
    /// # Arguments
    /// * `block_timestamp` - The current block timestamp
    /// * `tick` - The active tick at the current block timestamp
    /// * `liquidity` - The active liquidity at the current block timestamp
    ///
    /// # Returns
    /// A new observation with the accumulated values
    pub fn transform(
        last: &Observation,
        block_timestamp: u32,
        tick: i32,
        liquidity: U128,
    ) -> Observation {
        let delta = block_timestamp - last.block_timestamp;

        Observation {
            block_timestamp,
            tick_cumulative: last.tick_cumulative + (tick as i64 * delta as i64),
            seconds_per_liquidity_cumulative_x128: last.seconds_per_liquidity_cumulative_x128
                + if !liquidity.is_zero() {
                    let bytes = liquidity.to_bytes().expect("Failed to serialize U128");
                    let (liquidity_u256, _) = U256::from_bytes(&bytes).expect("Failed to parse U256");
                    (U256::from(delta) << 128) / liquidity_u256
                } else {
                    U256::zero()
                },
            initialized: true,
        }
    }
}

/// Parameters for initialize
#[odra::odra_type]
pub struct InitializeParams {
    pub sqrt_price_x96: U256,
}

/// Parameters for mint
#[odra::odra_type]
pub struct MintParams {
    pub recipient: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: U128,
}

/// Parameters for burn
#[odra::odra_type]
pub struct BurnParams {
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: U128,
}

/// Parameters for swap
#[odra::odra_type]
pub struct SwapParams {
    pub recipient: Address,
    pub zero_for_one: bool,
    pub amount_specified: I128,
    pub sqrt_price_limit_x96: U256,
}

/// State during swap execution
pub struct SwapState {
    /// The amount remaining to be swapped in/out of the input/output asset
    pub amount_specified_remaining: i128,
    /// The amount already swapped out/in of the output/input asset
    pub amount_calculated: i128,
    /// Current sqrt(price)
    pub sqrt_price_x96: U256,
    /// The current tick
    pub tick: i32,
    /// The global fee growth
    pub fee_growth_global_x128: U256,
    /// The current protocol fee
    pub protocol_fee: U256,
    /// The current liquidity in range
    pub liquidity: U128,
}

/// Step computations during swap
pub struct StepComputations {
    /// The price at the beginning of the step
    pub sqrt_price_start_x96: U256,
    /// The next tick to swap to from the current tick in the swap direction
    pub tick_next: i32,
    /// Whether tick_next is initialized or not
    pub initialized: bool,
    /// sqrt(price) for the next tick (1/0)
    pub sqrt_price_next_x96: U256,
    /// How much is being swapped in in this step
    pub amount_in: U256,
    /// How much is being swapped out
    pub amount_out: U256,
    /// How much fee is being paid in
    pub fee_amount: U256,
}
